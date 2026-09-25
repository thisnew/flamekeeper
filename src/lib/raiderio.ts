/**
 * Raider.IO 公会成员导入。
 *
 * 接口：GET https://raider.io/api/v1/guilds/profile
 *   region     必填，枚举 us/eu/tw/kr/**cn**
 *   realm      必填，slug 或 title 均可（"echo-ridge" / "Echo Ridge"）
 *   name       必填，公会名（不分大小写）
 *   fields     必须含 **members** —— 否则响应里根本没有 members 字段
 *   access_key 可选，但**带 key 的限额更高**，所以一直带上
 *
 * ⚠ 调用配额有限，**只在管理员手动点按钮时调用**，不做定时任务。
 *   抓取结果落库后，站内一切查询都走本地表。
 *
 * 实测（region=cn / 回音山 / Eternal Flame → 200，257 名成员）：
 *   members[].rank            数字职级
 *   members[].character.name  角色名（国服多为中文，与 WTF 目录名一致）
 *   members[].character.realm 英文 Title（"Echo Ridge"），**不是**中文也不是 slug
 *   members[].character.active_spec_role  大写 TANK/HEALER/DPS
 *   members[].character 里**没有**装等与等级
 */
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secrets";
import { resolveRealm } from "@/lib/realms";

export const RAIDERIO_GUILD_URL = "https://raider.io/api/v1/guilds/profile";

/** 抓取超时。 */
const FETCH_TIMEOUT_MS = 20_000;

/** Setting key 汇总。 */
export const RIO_SETTING_KEYS = {
  region: "rio_region",
  realm: "rio_realm",
  guildName: "rio_guild_name",
  accessKey: "rio_access_key", // 加密存储
  syncedAt: "rio_synced_at",
  syncedCount: "rio_synced_count",
  lastError: "rio_last_error",
} as const;

/** 默认值（用户的公会）。 */
export const RIO_DEFAULTS = {
  region: "cn",
  realm: "回音山",
  guildName: "Eternal Flame",
  accessKey: "",
};

export type RioConfig = {
  region: string;
  realm: string;
  guildName: string;
  accessKey: string;
};

/** 读配置；access_key 解密。DB 没有就用默认值。 */
export async function getRioConfig(): Promise<RioConfig> {
  let map: Record<string, string> = {};
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: Object.values(RIO_SETTING_KEYS) } },
      select: { key: true, value: true },
    });
    for (const r of rows) map[r.key] = r.value;
  } catch {
    /* 回落默认值 */
  }

  const rawKey = map[RIO_SETTING_KEYS.accessKey] || RIO_DEFAULTS.accessKey;

  return {
    region: map[RIO_SETTING_KEYS.region] || RIO_DEFAULTS.region,
    realm: map[RIO_SETTING_KEYS.realm] || RIO_DEFAULTS.realm,
    guildName: map[RIO_SETTING_KEYS.guildName] || RIO_DEFAULTS.guildName,
    // 明文（尚未加密）也能用 —— 兼容首次写入与手工改库
    accessKey: rawKey ? decryptSecret(rawKey) : "",
  };
}

export type GuildMemberRecord = {
  characterName: string;
  realmTitle: string;
  realmSlug: string;
  className: string | null;
  specName: string | null;
  specRole: string | null;
  rank: number | null;
  profileUrl: string | null;
  lastCrawledAt: Date | null;
};

function str(v: unknown, max = 64): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  return s ? s.slice(0, max) : null;
}

/**
 * 把任意写法的服务器名归一成 slug。
 *
 * 这是中文名与英文 Title 能对上的关键：
 *   WTF 目录给的「回音山」      → 字典按 name 命中 → echo-ridge
 *   Raider.IO 给的 "Echo Ridge" → 字典按 slug 命中（空格转连字符）→ echo-ridge
 * 字典里查不到时退回「小写 + 空格转连字符」，至少保证英文侧自洽。
 */
export async function canonicalRealmSlug(input: string): Promise<string> {
  const found = await resolveRealm(input);
  if (found) return found.slug;

  // 字典查不到时的回退：按暴雪 slug 约定归一（slug 只含 ^[a-z0-9-]+$）。
  //
  // ⚠ **撇号必须删掉，不能转成连字符**：
  //   字典里 Al'ar = 凤凰之神，slug 是 `alar`；
  //   若把撇号转连字符会得到 `al-ar`，与 `alar` 对不上。
  //   后果比显示错更严重 —— 这个函数**同时用于 WTF↔公会名单匹配**，
  //   对不上意味着这两个服务器的公会成员会被误判成「非公会成员」而拒绝导入。
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/['\u2018\u2019`\u00B4]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) return input.trim().toLowerCase();

  // 用归一后的 slug 再查一次字典，尽量拿到官方 slug（比如大小写/别名差异）
  const bySlug = await resolveRealm(slug);
  return bySlug ? bySlug.slug : slug;
}

/**
 * 解析公会成员响应。
 * 严格校验信封：结构不符宁可拒绝，也不要把脏数据写进库。
 */
export function parseGuildMembers(payload: unknown): {
  ok: true;
  guildName: string;
  region: string;
  realmTitle: string;
  raw: any[];
} | { ok: false; error: string } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "响应不是 JSON 对象" };
  }
  const p = payload as any;

  // Raider.IO 的报错形态：{ statusCode, error, message }
  if (p.statusCode && p.statusCode >= 400) {
    return { ok: false, error: `Raider.IO 返回 ${p.statusCode}：${p.message ?? p.error ?? "未知错误"}` };
  }
  if (typeof p.error === "string" && !p.members) {
    return { ok: false, error: `Raider.IO 报错：${p.error}` };
  }

  if (!Array.isArray(p.members)) {
    return {
      ok: false,
      error: "响应里没有 members 数组 —— 请求必须带 fields=members，或公会名/服务器不正确",
    };
  }
  if (p.members.length === 0) {
    return { ok: false, error: "公会成员列表为空，不覆盖现有数据" };
  }

  return {
    ok: true,
    guildName: str(p.name, 64) ?? "",
    region: str(p.region, 8) ?? "",
    realmTitle: str(p.realm, 64) ?? "",
    raw: p.members,
  };
}

/** 抓取公会成员。 */
export async function fetchGuildMembers(cfg: RioConfig): Promise<
  { ok: true; guildName: string; region: string; realmTitle: string; members: GuildMemberRecord[] } | { ok: false; error: string }
> {
  if (!cfg.guildName) {
    return { ok: false, error: "未配置公会名" };
  }

  // realm 优先用字典转成 slug（Raider.IO 两种都收，slug 更稳）
  const realm = await canonicalRealmSlug(cfg.realm);

  const url = new URL(RAIDERIO_GUILD_URL);
  url.searchParams.set("region", cfg.region);
  url.searchParams.set("realm", realm);
  url.searchParams.set("name", cfg.guildName);
  url.searchParams.set("fields", "members");
  if (cfg.accessKey) url.searchParams.set("access_key", cfg.accessKey);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "User-Agent": "Flamekeeper/1.0" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `无法访问 Raider.IO（${msg}）。请确认服务器网络可达 raider.io。` };
  }

  if (res.status === 429) {
    return { ok: false, error: "Raider.IO 触发限流（HTTP 429）。调用配额有限，请稍后再试。" };
  }
  if (!res.ok) {
    return { ok: false, error: `Raider.IO 返回 HTTP ${res.status}` };
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return { ok: false, error: "Raider.IO 返回的不是合法 JSON" };
  }

  const parsed = parseGuildMembers(payload);
  if (!parsed.ok) return parsed;

  const members: GuildMemberRecord[] = [];
  const seen = new Set<string>();
  let dropped = 0;

  for (const m of parsed.raw) {
    const c = m?.character;
    const name = str(c?.name, 64);
    const realmTitle = str(c?.realm, 64);
    if (!name || !realmTitle) {
      dropped++;
      continue;
    }

    const realmSlug = await canonicalRealmSlug(realmTitle);
    const key = `${realmSlug}/${name.toLowerCase()}`;
    if (seen.has(key)) {
      dropped++;
      continue;
    }
    seen.add(key);

    const crawled = str(c?.last_crawled_at, 32);
    members.push({
      characterName: name,
      realmTitle,
      realmSlug,
      className: str(c?.class, 32),
      specName: str(c?.active_spec_name, 32),
      specRole: str(c?.active_spec_role, 16),
      rank: typeof m?.rank === "number" ? m.rank : null,
      profileUrl: str(c?.profile_url, 256),
      lastCrawledAt: crawled && !Number.isNaN(Date.parse(crawled)) ? new Date(crawled) : null,
    });
  }

  if (members.length === 0) {
    return { ok: false, error: `没有解析出任何有效成员（丢弃 ${dropped} 条）` };
  }

  return {
    ok: true,
    guildName: parsed.guildName || cfg.guildName,
    region: parsed.region || cfg.region,
    realmTitle: parsed.realmTitle,
    members,
  };
}

/**
 * 落库。用 upsert 而不是清空重插 —— 清空会让并发查询短暂看到空名单，
 * 且中途失败就彻底没数据了。
 */
export async function syncGuildMembers(
  members: GuildMemberRecord[],
  guildName: string,
  region: string
): Promise<{ created: number; updated: number; total: number }> {
  const existing = await prisma.guildMember.findMany({
    where: { region },
    select: { characterName: true, realmSlug: true },
  });
  const existingKeys = new Set(existing.map((m) => `${m.realmSlug}/${m.characterName}`));

  let created = 0;
  let updated = 0;

  for (const m of members) {
    await prisma.guildMember.upsert({
      where: {
        region_realmSlug_characterName: {
          region,
          realmSlug: m.realmSlug,
          characterName: m.characterName,
        },
      },
      update: { ...m, guildName, region },
      create: { ...m, guildName, region },
    });
    if (existingKeys.has(`${m.realmSlug}/${m.characterName}`)) updated++;
    else created++;
  }

  const now = new Date().toISOString();
  await prisma.$transaction([
    prisma.setting.upsert({
      where: { key: RIO_SETTING_KEYS.syncedAt },
      update: { value: now },
      create: { key: RIO_SETTING_KEYS.syncedAt, value: now },
    }),
    prisma.setting.upsert({
      where: { key: RIO_SETTING_KEYS.syncedCount },
      update: { value: String(members.length) },
      create: { key: RIO_SETTING_KEYS.syncedCount, value: String(members.length) },
    }),
    prisma.setting.upsert({
      where: { key: RIO_SETTING_KEYS.lastError },
      update: { value: "" },
      create: { key: RIO_SETTING_KEYS.lastError, value: "" },
    }),
  ]);

  const total = await prisma.guildMember.count({ where: { region } });
  return { created, updated, total };
}

/** 记录失败原因，便于后台展示「上次为什么没成功」。 */
export async function recordRioError(message: string): Promise<void> {
  try {
    await prisma.setting.upsert({
      where: { key: RIO_SETTING_KEYS.lastError },
      update: { value: message.slice(0, 500) },
      create: { key: RIO_SETTING_KEYS.lastError, value: message.slice(0, 500) },
    });
  } catch {
    /* 记录失败就算了，不该影响主流程 */
  }
}

/** 同步状态（后台展示）。 */
export async function getRioSyncInfo(): Promise<{
  syncedAt: string | null;
  syncedCount: number | null;
  lastError: string | null;
  total: number;
}> {
  try {
    const [rows, total] = await Promise.all([
      prisma.setting.findMany({
        where: { key: { in: [RIO_SETTING_KEYS.syncedAt, RIO_SETTING_KEYS.syncedCount, RIO_SETTING_KEYS.lastError] } },
        select: { key: true, value: true },
      }),
      prisma.guildMember.count(),
    ]);
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const countRaw = map.get(RIO_SETTING_KEYS.syncedCount);
    return {
      syncedAt: map.get(RIO_SETTING_KEYS.syncedAt) || null,
      syncedCount: countRaw ? Number(countRaw) : null,
      lastError: map.get(RIO_SETTING_KEYS.lastError) || null,
      total,
    };
  } catch {
    return { syncedAt: null, syncedCount: null, lastError: null, total: 0 };
  }
}

// ---------------------------------------------------------------------------
// 匹配：WTF 导入时判断某个角色是不是公会成员
// ---------------------------------------------------------------------------

/**
 * 按「服务器 + 角色名」匹配公会成员。
 *
 * 服务器两侧都先归一成 slug 再比（中文名 vs 英文 Title 的差异由此消除）；
 * 角色名不分大小写。注意**国服角色名多为中文**，所以基本是精确匹配。
 */
export async function matchGuildMember(realmInput: string, characterName: string) {
  const realmSlug = await canonicalRealmSlug(realmInput);
  const name = characterName?.trim();
  if (!name) return null;

  return prisma.guildMember.findFirst({
    where: {
      realmSlug,
      characterName: { equals: name, mode: "insensitive" },
    },
  });
}

/** 批量匹配（WTF 导入时用，避免逐个查库）。 */
export async function matchGuildMembersBulk(
  items: { realm: string; name: string }[]
): Promise<Map<string, string>> {
  if (items.length === 0) return new Map();

  // 一次性把所有候选名拉出来比，减少查询次数
  const names = [...new Set(items.map((i) => i.name.trim()).filter(Boolean))];
  const rows = await prisma.guildMember.findMany({
    where: { characterName: { in: names, mode: "insensitive" } },
    select: { id: true, characterName: true, realmSlug: true },
  });

  const byNameRealm = new Map<string, string>();
  const byName = new Map<string, { id: string; realmSlug: string }[]>();
  for (const r of rows) {
    byNameRealm.set(`${r.realmSlug}/${r.characterName.toLowerCase()}`, r.id);
    const list = byName.get(r.characterName.toLowerCase()) ?? [];
    list.push({ id: r.id, realmSlug: r.realmSlug });
    byName.set(r.characterName.toLowerCase(), list);
  }

  const out = new Map<string, string>();
  for (const item of items) {
    const realmSlug = await canonicalRealmSlug(item.realm);
    const key = `${realmSlug}/${item.name.trim().toLowerCase()}`;
    const exact = byNameRealm.get(key);
    if (exact) {
      out.set(`${item.realm}/${item.name}`, exact);
      continue;
    }
    // 服务器对不上时退回「同名且只有一个」的情形 —— 跨服同名会拒绝，宁可漏也不错绑
    const sameName = byName.get(item.name.trim().toLowerCase()) ?? [];
    if (sameName.length === 1) out.set(`${item.realm}/${item.name}`, sameName[0].id);
  }
  return out;
}
