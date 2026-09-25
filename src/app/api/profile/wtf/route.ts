import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  WTF_MAX_ACCOUNTS,
  WTF_MAX_CHARACTERS,
  WTF_MAX_FILE_BYTES,
  isAllowedWtfFile,
} from "@/lib/wtf";
import {
  WTF_MAX_TOTAL_BYTES,
  listWtfFiles,
  removeAccountFiles,
  safeStoragePath,
  saveWtfFile,
} from "@/lib/wtf-storage";

/** 名称类字段的统一清洗：去空白、去控制字符、限长。 */
function cleanName(v: unknown, max = 64): string {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

/** 当前用户已保存的 WTF 账号、角色与文件清单。 */
export async function GET() {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const [accounts, characters, files] = await Promise.all([
      prisma.wtfAccount.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: { accountName: true, realmCount: true },
      }),
      prisma.character.findMany({
        where: { userId: user.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, server: true, accountName: true, sortOrder: true },
      }),
      listWtfFiles(user.id),
    ]);

    return NextResponse.json({
      accounts,
      characters,
      fileCount: files.length,
      totalBytes: files.reduce((s, f) => s + f.size, 0),
    });
  } catch (error) {
    console.error("[profile/wtf] GET:", error);
    return NextResponse.json({ error: "获取角色失败" }, { status: 500 });
  }
}

/**
 * 导入：**上传 WTF 文件内容并落盘**，同时按勾选的角色建档。
 *
 * multipart/form-data：
 *   files[]     —— 要保存的文件（前端已按 >1000KB / 扩展名 过滤，服务端再验一遍）
 *   characters  —— JSON：用户勾选要录入名册的角色 [{accountName, realm, name}]
 *
 * 文件**全部保存**（需求是「上传 WTF 内的所有内容」），
 * 而角色记录只按勾选创建 —— 目录里的若干角色他可能不想登记进名册。
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "请求格式不正确（需要 multipart/form-data）" },
        { status: 400 }
      );
    }

    const rawFiles = form.getAll("files").filter((f): f is File => f instanceof File);
    if (rawFiles.length === 0) {
      return NextResponse.json({ error: "没有收到任何文件" }, { status: 400 });
    }

    let selected: { accountName: string; realm: string; name: string }[] = [];
    try {
      const parsed = JSON.parse(String(form.get("characters") || "[]"));
      if (Array.isArray(parsed)) {
        selected = parsed
          .map((c: any) => ({
            accountName: cleanName(c?.accountName),
            realm: cleanName(c?.realm, 32),
            name: cleanName(c?.name, 32),
          }))
          .filter((c) => c.accountName && c.realm && c.name);
      }
    } catch {
      return NextResponse.json({ error: "characters 不是合法 JSON" }, { status: 400 });
    }

    // 服务端独立再验一道：类型与大小不能只信前端
    const skipped = { badExtension: 0, tooLarge: 0, badPath: 0 };
    const toWrite: { storagePath: string; buffer: Buffer }[] = [];
    let total = 0;

    for (const f of rawFiles) {
      const relPath = (f as any).webkitRelativePath || f.name || "";
      const filename = relPath.replace(/\\/g, "/").split("/").pop() ?? f.name;

      if (!isAllowedWtfFile(filename)) {
        skipped.badExtension++;
        continue;
      }
      if (f.size > WTF_MAX_FILE_BYTES) {
        skipped.tooLarge++;
        continue;
      }

      const storagePath = safeStoragePath(relPath);
      if (!storagePath) {
        skipped.badPath++;
        continue;
      }

      total += f.size;
      if (total > WTF_MAX_TOTAL_BYTES) {
        return NextResponse.json(
          {
            error: `本次上传超过 ${Math.round(
              WTF_MAX_TOTAL_BYTES / 1024 / 1024
            )} MB 上限，请分账号多次上传`,
          },
          { status: 413 }
        );
      }

      toWrite.push({ storagePath, buffer: Buffer.from(await f.arrayBuffer()) });
    }

    if (toWrite.length === 0) {
      return NextResponse.json(
        {
          error: `没有可保存的文件（扩展名不符 ${skipped.badExtension}，超过 1000KB ${skipped.tooLarge}，路径非法 ${skipped.badPath}）`,
        },
        { status: 400 }
      );
    }

    // ---- 配额头一道：账号 ----
    const existingAccounts = await prisma.wtfAccount.findMany({
      where: { userId: user.id },
      select: { accountName: true },
    });
    const existingNames = new Set(existingAccounts.map((a) => a.accountName));

    const accountsInUpload = [
      ...new Set(toWrite.map((w) => w.storagePath.split("/")[0]).filter(Boolean)),
    ];
    const newAccountNames = accountsInUpload.filter((n) => !existingNames.has(n));

    if (existingNames.size + newAccountNames.length > WTF_MAX_ACCOUNTS) {
      return NextResponse.json(
        {
          error: `最多保存 ${WTF_MAX_ACCOUNTS} 个 WTF 账号。你已有 ${existingNames.size} 个，本次涉及 ${newAccountNames.length} 个新账号。`,
        },
        { status: 400 }
      );
    }

    // ---- 配额头二道：角色 ----
    const existingChars = await prisma.character.findMany({
      where: { userId: user.id },
      select: { name: true, server: true, sortOrder: true },
    });
    const existingCharKeys = new Set(existingChars.map((c) => `${c.server}/${c.name}`));

    const charsToCreate: { name: string; server: string; accountName: string }[] = [];
    const seen = new Set<string>();
    for (const c of selected) {
      const key = `${c.realm}/${c.name}`;
      if (existingCharKeys.has(key) || seen.has(key)) continue;
      seen.add(key);
      charsToCreate.push({ name: c.name, server: c.realm, accountName: c.accountName });
    }

    if (existingChars.length + charsToCreate.length > WTF_MAX_CHARACTERS) {
      return NextResponse.json(
        {
          error: `最多保存 ${WTF_MAX_CHARACTERS} 个角色。你已有 ${existingChars.length} 个，本次新增 ${charsToCreate.length} 个，请少选一些。`,
        },
        { status: 400 }
      );
    }

    // ---- 落盘 ----
    let savedBytes = 0;
    let savedFiles = 0;
    for (const w of toWrite) {
      savedBytes += await saveWtfFile(user.id, w.storagePath, w.buffer);
      savedFiles++;
    }

    // ---- 建档 ----
    let nextOrder = existingChars.reduce((m, c) => Math.max(m, c.sortOrder), -1) + 1;

    const result = await prisma.$transaction(async (tx) => {
      for (const accountName of accountsInUpload) {
        // 该账号下出现了几个服务器（服务器位要排除 SavedVariables 等账号级目录）
        const realms = new Set(
          toWrite
            .map((w) => w.storagePath.split("/"))
            .filter((parts) => parts[0] === accountName && parts.length >= 3)
            .map((parts) => parts[1])
            .filter((r) => r && r.toLowerCase() !== "savedvariables")
        );
        await tx.wtfAccount.upsert({
          where: { userId_accountName: { userId: user.id, accountName } },
          update: { realmCount: realms.size },
          create: { userId: user.id, accountName, realmCount: realms.size },
        });
      }

      let created = 0;
      for (const c of charsToCreate) {
        await tx.character.create({
          data: {
            userId: user.id,
            name: c.name,
            server: c.server,
            accountName: c.accountName,
            sortOrder: nextOrder++,
            isPublic: true,
          },
        });
        created++;
      }
      return { created };
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "WTF_IMPORT",
        detail: `上传 WTF：保存 ${savedFiles} 个文件（${Math.round(
          savedBytes / 1024
        )} KB），新增账号 ${newAccountNames.length} 个、角色 ${result.created} 个`,
      },
    });

    return NextResponse.json({
      success: true,
      savedFiles,
      savedBytes,
      createdCharacters: result.created,
      newAccounts: newAccountNames.length,
      skipped,
      message: `已保存 ${savedFiles} 个文件，录入 ${result.created} 个角色`,
    });
  } catch (error) {
    console.error("[profile/wtf] POST:", error);
    return NextResponse.json({ error: "导入失败，请稍后再试" }, { status: 500 });
  }
}

/** 删除一个 WTF 账号：连同磁盘文件与角色记录。 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const accountName = new URL(req.url).searchParams.get("accountName");
    if (!accountName) {
      return NextResponse.json({ error: "缺少 accountName" }, { status: 400 });
    }

    const owned = await prisma.wtfAccount.findUnique({
      where: { userId_accountName: { userId: user.id, accountName } },
      select: { id: true },
    });
    if (!owned) return NextResponse.json({ error: "账号不存在" }, { status: 404 });

    // 先删磁盘文件，再删数据库记录
    const deletedFiles = await removeAccountFiles(user.id, accountName);

    const deletedChars = await prisma.$transaction(async (tx) => {
      const res = await tx.character.deleteMany({ where: { userId: user.id, accountName } });
      await tx.wtfAccount.delete({ where: { id: owned.id } });
      return res.count;
    });

    return NextResponse.json({
      success: true,
      deletedCharacters: deletedChars,
      deletedFiles,
      message: `已移除账号 ${accountName}：${deletedFiles} 个文件、${deletedChars} 个角色`,
    });
  } catch (error) {
    console.error("[profile/wtf] DELETE:", error);
    return NextResponse.json({ error: "删除失败，请稍后再试" }, { status: 500 });
  }
}
