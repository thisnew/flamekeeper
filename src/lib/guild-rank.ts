/**
 * 会阶（公会内部头衔）—— 与系统权限 `role` 完全解耦。
 *
 *   role      ：能不能进后台、改设置（VISITOR / USER / MEMBER / OFFICER / ADMIN）
 *   guildRank ：在公会里是什么身份（会长 / 团长 / 核心 / 成员）
 *
 * ⚠ 管理员（role = ADMIN）**不等于**会长。管理员是站点超级管理员，
 *   会长是一个会阶；一个人可以同时是两者，也可以是其中之一。
 *   历史遗留：早期代码把 ADMIN 直接显示成「会长」，那是错的。
 *
 * 纯函数 + 常量，服务端与客户端都可安全导入（不引 next-auth）。
 */

export const GUILD_RANKS = ["LEADER", "RAID_LEADER", "CORE", "MEMBER"] as const;
export type GuildRank = (typeof GUILD_RANKS)[number];

export const GUILD_RANK_LABELS: Record<GuildRank, string> = {
  LEADER: "会长",
  RAID_LEADER: "团长",
  CORE: "核心",
  MEMBER: "成员",
};

/** 展示用的样式（图标名单独处理，避免这里引入 lucide 依赖）。 */
export const GUILD_RANK_STYLES: Record<GuildRank, string> = {
  LEADER: "text-wow-gold border-wow-gold/40 bg-wow-gold/10",
  RAID_LEADER: "text-wow-orange border-wow-orange/40 bg-wow-orange/10",
  CORE: "text-wow-blue-light border-wow-blue/40 bg-wow-blue/10",
  MEMBER: "text-wow-green border-wow-green/30 bg-wow-green-dark/10",
};

/** 排序权重：会长在前。用于名册排序。 */
export const GUILD_RANK_ORDER: Record<GuildRank, number> = {
  LEADER: 0,
  RAID_LEADER: 1,
  CORE: 2,
  MEMBER: 3,
};

export function isGuildRank(v: unknown): v is GuildRank {
  return typeof v === "string" && (GUILD_RANKS as readonly string[]).includes(v);
}

/** 安全取标签（非法值原样返回）。 */
export function guildRankLabel(rank?: string | null): string {
  return isGuildRank(rank) ? GUILD_RANK_LABELS[rank] : rank || GUILD_RANK_LABELS.MEMBER;
}

/** 安全取样式。 */
export function guildRankStyle(rank?: string | null): string {
  return isGuildRank(rank) ? GUILD_RANK_STYLES[rank] : GUILD_RANK_STYLES.MEMBER;
}

/** 排序用权重（未知值排最后）。 */
export function guildRankOrder(rank?: string | null): number {
  return isGuildRank(rank) ? GUILD_RANK_ORDER[rank] : 99;
}
