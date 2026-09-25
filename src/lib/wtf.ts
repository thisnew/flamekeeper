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
  skipped: { tooLarge: number; badExtension: number; unrecognizedPath: number };
  /** 收到的文件总数 */
  totalFiles: number;
};

export function extensionOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : "";
}

export function isAllowedWtfFile(filename: string): boolean {
  return (WTF_ALLOWED_EXTENSIONS as readonly string[]).includes(extensionOf(filename));
}

/**
 * 从 `webkitRelativePath` 里解析出 账号 / 服务器 / 角色名。
 *
 * 只认「账号目录后面刚好两层」的结构：
 *   <任意前缀>/Account/<账号>/<服务器>/<角色>/<文件名>
 * 前缀可以是 WTF，也可以直接就是 Account（用户选哪一层都行）。
 */
export function parseWtfPath(
  relativePath: string
): { accountName: string; realm: string; character: string } | null {
  // 统一分隔符，去掉首尾斜杠
  const parts = relativePath.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.length < 5) return null;

  // 找到 "Account" 那一层；没有就认为第一个目录就是账号目录
  let accountIdx = parts.findIndex((p) => p.toLowerCase() === "account");
  if (accountIdx === -1) {
    // 兼容用户直接选了账号目录本身的情况：webkitRelativePath 会以账号名开头
    // 此时无法可靠区分，放弃解析（宁可不导入，也不要导错）
    return null;
  }

  // 账号 / 服务器 / 角色 必须都存在于 Account 之后
  const accountName = parts[accountIdx + 1];
  const realm = parts[accountIdx + 2];
  const character = parts[accountIdx + 3];
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
 *   - 路径解析不出账号/服务器/角色：跳过
 */
export function parseWtfFiles(files: FileLike[]): ParsedWtf {
  const skipped = { tooLarge: 0, badExtension: 0, unrecognizedPath: 0 };
  const byAccount = new Map<
    string,
    { accountName: string; realms: Set<string>; characters: Map<string, { name: string; realm: string }> }
  >();

  for (const f of files) {
    const filename = f.relativePath.replace(/\\/g, "/").split("/").pop() ?? "";

    if (!isAllowedWtfFile(filename)) {
      skipped.badExtension++;
      continue;
    }
    if (f.size > WTF_MAX_FILE_BYTES) {
      skipped.tooLarge++;
      continue;
    }

    const parsed = parseWtfPath(f.relativePath);
    if (!parsed) {
      skipped.unrecognizedPath++;
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

  return { accounts, skipped, totalFiles: files.length };
}
