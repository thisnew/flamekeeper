/**
 * WTF 配置目录解析（纯函数，服务端/客户端都能用）。
 *
 * 背景：网页**无法读取本地路径**（浏览器安全沙箱），所以不能直接读
 * `K:\暴雪游戏\魔兽世界\_retail_\WTF\Account\NZY900202`。
 * 只能通过 `<input webkitdirectory>` 让用户主动选择目录，浏览器会把每个文件的
 * `webkitRelativePath` 一起提交，形如：
 *
 *   Account/NZY900202/破碎岭/迈沫蕊暗云/SavedVariables/xxx.lua
 *   └ 账号目录  ┘└服务器 ┘└ 角色名   ┘
 *
 * 我们**只取目录名**，不保存任何文件内容。
 */

/** 单个文件超过这个大小直接跳过（静默，不提示）。 */
export const WTF_MAX_FILE_BYTES = 1000 * 1024; // 1000 KB

/** 只接受这些扩展名。 */
export const WTF_ALLOWED_EXTENSIONS = ["txt", "md5", "lua", "bak", "old", "wtf"] as const;

/** 每位成员最多几个 WTF 账号。 */
export const WTF_MAX_ACCOUNTS = 5;

/** 每位成员最多导入几个游戏角色。 */
export const WTF_MAX_CHARACTERS = 20;

export type ParsedWtf = {
  /** 账号目录名 → 该账号下的角色 */
  accounts: {
    accountName: string;
    realms: string[];
    characters: { name: string; realm: string }[];
  }[];
  /** 被跳过的文件统计，便于前端如实告知用户 */
  skipped: {
    tooLarge: number;
    badExtension: number;
    unrecognizedPath: number;
    /** 浏览器根本没提供目录结构（webkitdirectory 没生效）的文件数 */
    noDirectoryInfo: number;
  };
  /** 收到的文件总数 */
  totalFiles: number;
  /**
   * 诊断用：给出的前几条相对路径。
   * 解析失败时用它一眼看出是「选错了层级」还是「浏览器没给目录结构」，
   * 而不是只有一句「没有解析出任何账号」让人干瞪眼。
   */
  samplePaths: string[];
};

export function extensionOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : "";
}

export function isAllowedWtfFile(filename: string): boolean {
  return (WTF_ALLOWED_EXTENSIONS as readonly string[]).includes(extensionOf(filename));
}

/**
 * 从 `webkitRelativePath` 里解析出 账号 / 服务器 / 角色。
 *
 * 用户可能选三种不同的目录，**三种都必须能解析**。
 * （早期版本只认中间那种，而界面文案偏偏引导用户选第三种，
 *   结果就是「永远解析不出账号」——这个坑已经踩过，别再退回去。）
 *
 *   A) 选 WTF 目录      → WTF/Account/<账号>/<服务器>/<角色>/<文件>
 *   B) 选 Account 目录  → Account/<账号>/<服务器>/<角色>/<文件>
 *   C) 选账号目录       → <账号>/<服务器>/<角色>/<文件>
 *
 * 规则：先找 "Account" 那一层（大小写不敏感）；找不到就把第 0 段当账号名
 * —— 这正是情形 C。三种情形下「账号 → 服务器 → 角色」的相对顺序一致。
 *
 * 层级不足返回 null：宁可拒绝，也不要把服务器名当成账号名导进去。
 */
export function parseWtfPath(
  relativePath: string
): { accountName: string; realm: string; character: string } | null {
  // 统一分隔符，去掉首尾与空段
  const parts = relativePath.replace(/\\/g, "/").split("/").filter(Boolean);

  const accountIdx = parts.findIndex((p) => p.toLowerCase() === "account");
  const base = accountIdx === -1 ? 0 : accountIdx + 1;

  // 账号 / 服务器 / 角色 之后必须还有文件名，故至少 base + 4 段
  if (parts.length < base + 4) return null;

  const accountName = parts[base];
  const realm = parts[base + 1];
  const character = parts[base + 2];
  if (!accountName || !realm || !character) return null;

  return { accountName, realm, character };
}

type FileLike = { relativePath: string; size: number };

/**
 * 把选中的文件列表解析成「账号 → 角色」结构。
 *
 * 过滤规则（按需求）：
 *   - 单文件 > 1000KB：**静默跳过**（只计数，不提示）
 *   - 扩展名不在白名单：跳过
 *   - 路径解析不出账号/服务器/角色：跳过并留样，便于诊断
 */
export function parseWtfFiles(files: FileLike[]): ParsedWtf {
  const skipped = {
    tooLarge: 0,
    badExtension: 0,
    unrecognizedPath: 0,
    noDirectoryInfo: 0,
  };
  const byAccount = new Map<
    string,
    { accountName: string; realms: Set<string>; characters: Map<string, { name: string; realm: string }> }
  >();
  const samplePaths: string[] = [];

  for (const f of files) {
    const rawPath = (f.relativePath ?? "").trim();

    // 浏览器没给出目录结构 —— 说明 webkitdirectory 没生效，
    // 或调用方回退成了 file.name。这种情况单独计数，好和「选错层级」区分开。
    if (!rawPath || !rawPath.includes("/") && !rawPath.includes("\\")) {
      skipped.noDirectoryInfo++;
      if (samplePaths.length < 5) samplePaths.push(rawPath || "(空路径)");
      continue;
    }

    const filename = rawPath.replace(/\\/g, "/").split("/").pop() ?? "";

    if (!isAllowedWtfFile(filename)) {
      skipped.badExtension++;
      continue;
    }
    if (f.size > WTF_MAX_FILE_BYTES) {
      skipped.tooLarge++;
      continue;
    }

    const parsed = parseWtfPath(rawPath);
    if (!parsed) {
      skipped.unrecognizedPath++;
      if (samplePaths.length < 5) samplePaths.push(rawPath);
      continue;
    }

    let entry = byAccount.get(parsed.accountName);
    if (!entry) {
      entry = { accountName: parsed.accountName, realms: new Set(), characters: new Map() };
      byAccount.set(parsed.accountName, entry);
    }
    entry.realms.add(parsed.realm);
    // 同一账号同一服务器下的同名角色视为同一个（WTF 里会有大量文件同属一个角色）
    entry.characters.set(`${parsed.realm}/${parsed.character}`, {
      name: parsed.character,
      realm: parsed.realm,
    });
  }

  const accounts = [...byAccount.values()]
    .sort((a, b) => a.accountName.localeCompare(b.accountName))
    .map((a) => ({
      accountName: a.accountName,
      realms: [...a.realms].sort(),
      characters: [...a.characters.values()].sort(
        (x, y) => x.realm.localeCompare(y.realm) || x.name.localeCompare(y.name)
      ),
    }));

  return { accounts, skipped, totalFiles: files.length, samplePaths };
}
