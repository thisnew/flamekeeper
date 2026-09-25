/**
 * 国服服务器字典：抓取、落库、查表。
 *
 * 数据源（暴雪国服）：
 *   https://webapi.blizzard.cn/wow-armory-server/api/server_status?server_type=wow_mainline
 *
 * 为什么存本地：其它功能需要「中文服务器名 ↔ 短写英文名」的映射
 * （WTF 里的角色目录是中文「破碎岭」，而 Raider.IO 这类接口要英文 slug
 *  `broken-peaks`）。查本地表就不会因为外部接口抽风而挂掉。
 *
 * 实测结论（360 条）：
 *   - `name`（中文）与 `slug`（英文）**各自唯一**
 *   - `id` 是**服务器组**，多个服务器共享（如 810 同时是火羽山/迦罗娜/…），不能当唯一键
 *   - `slug` 全部匹配 ^[a-z0-9-]+$
 */
import { prisma } from "@/lib/prisma";

export const BLIZZARD_CN_REALM_URL =
  "https://webapi.blizzard.cn/wow-armory-server/api/server_status?server_type=wow_mainline";

/** 记录同步元信息的 Setting key。 */
export const REALM_SYNCED_AT_KEY = "realm_data_synced_at";
export const REALM_SYNCED_COUNT_KEY = "realm_data_synced_count";

/** 抓取超时（毫秒）。暴雪接口正常几百毫秒返回，给足余量。 */
const FETCH_TIMEOUT_MS = 20_000;

export type RealmRecord = {
  name: string;
  slug: string;
  groupId: number | null;
  category: string | null;
  typeName: string | null;
  typeType: string | null;
  populationName: string | null;
  populationType: string | null;
  statusName: string | null;
  statusType: string | null;
  locale: string | null;
  timezone: string | null;
  region: string | null;
};

function str(v: unknown, max = 64): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  return s ? s.slice(0, max) : null;
}

/**
 * 解析暴雪接口返回体。
 *
 * 结构：{ code: 0, message: "成功", data: { List: [...] } }
 * 这里**严格校验** —— 外部接口随时可能改结构或返回错误码，
 * 与其把脏数据写进库，不如直接拒绝并说明原因。
 */
export function parseRealmPayload(payload: unknown): {
  ok: true; realms: RealmRecord[]
} | { ok: false; error: string } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "响应不是 JSON 对象" };
  }
  const p = payload as any;

  if (typeof p.code === "number" && p.code !== 0) {
    return { ok: false, error: `接口返回错误码 ${p.code}：${p.message ?? "无说明"}` };
  }

  const list = p?.data?.List;
  if (!Array.isArray(list)) {
    return { ok: false, error: "响应里没有 data.List 数组（接口结构可能已变更）" };
  }
  if (list.length === 0) {
    return { ok: false, error: "接口返回了空列表，不覆盖现有数据" };
  }

  const realms: RealmRecord[] = [];
  const seenName = new Set<string>();
  const seenSlug = new Set<string>();
  let dropped = 0;

  for (const item of list) {
    const name = str(item?.name, 32);
    const slug = str(item?.slug, 64);
    if (!name || !slug) {
      dropped++;
      continue;
    }
    // 唯一键冲突就丢弃后者，避免整批 upsert 失败
    if (seenName.has(name) || seenSlug.has(slug)) {
      dropped++;
      continue;
    }
    seenName.add(name);
    seenSlug.add(slug);

    realms.push({
      name,
      slug,
      groupId: typeof item?.id === "number" ? item.id : null,
      category: str(item?.category, 32),
      typeName: str(item?.type_name, 32),
      typeType: str(item?.type_type, 32),
      populationName: str(item?.population_name, 32),
      populationType: str(item?.population_type, 32),
      statusName: str(item?.status_name, 32),
      statusType: str(item?.status_type, 32),
      locale: str(item?.locale, 16),
      timezone: str(item?.timezone, 64),
      region: str(item?.region, 32),
    });
  }

  if (realms.length === 0) {
    return { ok: false, error: "没有任何有效的服务器记录（name/slug 均缺失）" };
  }

  return { ok: true, realms };
}

/** 抓取暴雪国服接口并解析。 */
export async function fetchBlizzardCnRealms(): Promise<
  { ok: true; realms: RealmRecord[] } | { ok: false; error: string }
> {
  let res: Response;
  try {
    res = await fetch(BLIZZARD_CN_REALM_URL, {
      headers: { Accept: "application/json", "User-Agent": "Flamekeeper/1.0" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `无法访问暴雪接口（${msg}）。请确认服务器网络能访问 webapi.blizzard.cn。`,
    };
  }

  if (!res.ok) {
    return { ok: false, error: `暴雪接口返回 HTTP ${res.status}` };
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return { ok: false, error: "暴雪接口返回的不是合法 JSON" };
  }

  return parseRealmPayload(payload);
}

/**
 * 同步入库（upsert），并记录同步时间。
 *
 * 用 upsert 而不是先清空再插入：清空会让并发查询短暂看到空表，
 * 而且一旦插入中途失败就彻底没数据了。upsert 是幂等的。
 */
export async function syncRealms(
  realms: RealmRecord[]
): Promise<{ created: number; updated: number; total: number }> {
  let created = 0;
  let updated = 0;

  // 先看哪些 name 已存在，用于统计「新增 vs 更新」
  const existing = await prisma.gameRealm.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map((r) => r.name));

  for (const r of realms) {
    await prisma.gameRealm.upsert({
      where: { name: r.name },
      update: { ...r },
      create: { ...r },
    });
    if (existingNames.has(r.name)) updated++;
    else created++;
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.setting.upsert({
      where: { key: REALM_SYNCED_AT_KEY },
      update: { value: now.toISOString() },
      create: { key: REALM_SYNCED_AT_KEY, value: now.toISOString() },
    }),
    prisma.setting.upsert({
      where: { key: REALM_SYNCED_COUNT_KEY },
      update: { value: String(realms.length) },
      create: { key: REALM_SYNCED_COUNT_KEY, value: String(realms.length) },
    }),
  ]);

  const total = await prisma.gameRealm.count();
  return { created, updated, total };
}

/** 读取上次同步信息（供后台展示）。 */
export async function getRealmSyncInfo(): Promise<{
  syncedAt: string | null;
  syncedCount: number | null;
  total: number;
}> {
  try {
    const [rows, total] = await Promise.all([
      prisma.setting.findMany({
        where: { key: { in: [REALM_SYNCED_AT_KEY, REALM_SYNCED_COUNT_KEY] } },
        select: { key: true, value: true },
      }),
      prisma.gameRealm.count(),
    ]);
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const countRaw = map.get(REALM_SYNCED_COUNT_KEY);
    return {
      syncedAt: map.get(REALM_SYNCED_AT_KEY) ?? null,
      syncedCount: countRaw ? Number(countRaw) : null,
      total,
    };
  } catch {
    return { syncedAt: null, syncedCount: null, total: 0 };
  }
}

// ---------------------------------------------------------------------------
// 查表：供其它功能使用（中文名 ↔ 英文 slug）
// ---------------------------------------------------------------------------

/** 按中文名查（WTF 目录名就是中文）。 */
export async function realmByName(name: string) {
  const key = name?.trim();
  if (!key) return null;
  return prisma.gameRealm.findUnique({ where: { name: key } });
}

/** 按英文 slug 查。 */
export async function realmBySlug(slug: string) {
  const key = slug?.trim().toLowerCase();
  if (!key) return null;
  return prisma.gameRealm.findUnique({ where: { slug: key } });
}

/**
 * 宽容地把任意写法解析成服务器记录：
 * 中文名、英文 slug、大小写、前后空格、以及英文里的空格（burning blade）
 * 都能识别 —— 因为数据来源五花八门（WTF 是中文，Raider.IO 是 slug）。
 */
export async function resolveRealm(input: string) {
  const raw = input?.trim();
  if (!raw) return null;

  // 先按中文名精确查
  const byName = await prisma.gameRealm.findUnique({ where: { name: raw } });
  if (byName) return byName;

  // 再按 slug 查（压缩空格与下划线成连字符）
  const slug = raw.toLowerCase().replace(/[\s_]+/g, "-");
  return prisma.gameRealm.findUnique({ where: { slug } });
}

/** 供自动补全用的模糊搜索（中文名或英文 slug 命中）。 */
export async function searchRealms(q: string, limit = 20) {
  const key = q?.trim();
  if (!key) {
    return prisma.gameRealm.findMany({ take: limit, orderBy: { name: "asc" } });
  }
  return prisma.gameRealm.findMany({
    where: {
      OR: [{ name: { contains: key } }, { slug: { contains: key.toLowerCase() } }],
    },
    take: limit,
    orderBy: { name: "asc" },
  });
}
