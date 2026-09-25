/**
 * WTF 上传文件的**私有**存储。
 *
 * 存哪里：默认 `<cwd>/storage/wtf/<userId>/...`（容器里即 `/app/storage/wtf`）。
 * 刻意**不放在 `public/` 下** —— `public` 里的文件可以被 URL 直接访问，
 * 而 SavedVariables 这类插件配置常含有插件 token、好友/公会名单等敏感内容，
 * 未登录的人不该拿得到。下载一律走鉴权路由。
 *
 * 布局：**以账号为根**归一化，屏蔽用户选的是 WTF / Account / 账号 目录：
 *   WTF/Account/NZY900202/破碎岭/角色/x.lua  →  NZY900202/破碎岭/角色/x.lua
 *   Account/NZY900202/...                    →  NZY900202/...
 *   NZY900202/...                            →  NZY900202/...
 */
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/** 存储根目录（可用 WTF_STORAGE_DIR 覆盖，便于测试）。 */
export function storageRoot(): string {
  return process.env.WTF_STORAGE_DIR || path.join(process.cwd(), "storage", "wtf");
}

/** 单次上传的总大小上限（防止把磁盘塞满）。 */
export const WTF_MAX_TOTAL_BYTES = 80 * 1024 * 1024; // 80 MB

/**
 * 把客户端给的相对路径归一化成**可安全落盘**的相对路径。
 *
 * 这是安全边界：relativePath 完全来自浏览器，必须当作不可信输入。
 * 拒绝：空、绝对路径、盘符、`..`、含 NUL、段数不足。
 * 归一化：统一分隔符 → 去掉 `Account` 之前的前缀 → 以账号名为根。
 *
 * 返回 null 表示路径不可用（跳过该文件）。
 */
export function safeStoragePath(relativePath: string): string | null {
  if (typeof relativePath !== "string" || !relativePath) return null;
  if (relativePath.includes("\u0000")) return null;

  const normalized = relativePath.replace(/\\/g, "/");

  // 绝对路径 / 盘符（C:/ 或 //server/share）
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) return null;

  const parts = normalized.split("/").filter((p) => p && p !== ".");
  if (parts.length < 2) return null;

  // 任一段是 .. 或包含 NUL/控制字符，直接拒绝
  for (const p of parts) {
    if (p === "..") return null;
    if (/[\u0000-\u001F\u007F]/.test(p)) return null;
    // Windows 保留字符，避免落盘后无法删除
    if (/[<>:"|?*]/.test(p)) return null;
  }

  // 以「账号」为根：优先找 Account 那一层，找不到就把第 0 段当账号
  const accountIdx = parts.findIndex((p) => p.toLowerCase() === "account");
  const from = accountIdx === -1 ? 0 : accountIdx + 1;

  const rest = parts.slice(from);
  if (rest.length < 2) return null; // 至少有 账号/文件

  const joined = rest.join("/");
  // 双保险：归一化后仍不得逃出根目录
  const resolved = path.resolve(storageRoot(), "_check_", joined);
  const base = path.resolve(storageRoot(), "_check_");
  if (resolved !== base && !resolved.startsWith(base + path.sep)) return null;

  return joined;
}

/** 某用户的存储目录。 */
export function userStorageDir(userId: string): string {
  // userId 是 cuid，仍然过一遍白名单，杜绝任何拼接注入
  const safe = String(userId).replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safe) throw new Error("invalid userId");
  return path.join(storageRoot(), safe);
}

/** 写入一个文件（自动建父目录）。返回写入字节数。 */
export async function saveWtfFile(
  userId: string,
  storageRelPath: string,
  data: Buffer
): Promise<number> {
  const target = path.join(userStorageDir(userId), storageRelPath);

  // 再次确认没有逃出用户目录
  const base = userStorageDir(userId);
  const resolved = path.resolve(target);
  if (!resolved.startsWith(path.resolve(base) + path.sep)) {
    throw new Error("path escapes user storage");
  }

  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, data);
  return data.length;
}

/** 递归列出某用户存储下所有文件的相对路径与大小。 */
export async function listWtfFiles(
  userId: string
): Promise<{ relPath: string; size: number }[]> {
  const base = userStorageDir(userId);
  const out: { relPath: string; size: number }[] = [];

  async function walk(dir: string, prefix: string) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // 目录不存在
    }
    for (const e of entries) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) {
        await walk(path.join(dir, e.name), rel);
      } else if (e.isFile()) {
        const st = await fs.stat(path.join(dir, e.name));
        out.push({ relPath: rel, size: st.size });
      }
    }
  }

  await walk(base, "");
  return out.sort((a, b) => a.relPath.localeCompare(b.relPath, "zh-CN"));
}

/** 读取单个文件（供鉴权下载）。 */
export async function readWtfFile(
  userId: string,
  relPath: string
): Promise<Buffer | null> {
  const safe = safeJoin(userId, relPath);
  if (!safe) return null;
  try {
    return await fs.readFile(safe);
  } catch {
    return null;
  }
}

/** 拼路径并确保不逃出用户目录。 */
function safeJoin(userId: string, relPath: string): string | null {
  const base = path.resolve(userStorageDir(userId));
  const target = path.resolve(base, relPath);
  if (target !== base && !target.startsWith(base + path.sep)) return null;
  return target;
}

/** 删除某账号目录下的所有文件（连带删除空目录）。 */
export async function removeAccountFiles(
  userId: string,
  accountName: string
): Promise<number> {
  const dir = safeJoin(userId, accountName);
  if (!dir) return 0;

  let count = 0;
  async function rm(p: string) {
    let entries;
    try {
      entries = await fs.readdir(p, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const child = path.join(p, e.name);
      if (e.isDirectory()) await rm(child);
      else count++;
      await fs.rm(child, { recursive: true, force: true }).catch(() => {});
    }
  }
  await rm(dir);
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  return count;
}

/** 内容指纹，用于前端展示「已保存」状态。 */
export function fingerprint(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}
