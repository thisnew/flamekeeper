/**
 * 「成员名册」两个维度的纯映射逻辑。
 *
 * 抽出来是为了**可测** —— 这里是这次改动的核心：
 * 把「用户 ↔ 角色」的绑定关系摊平成两个视图需要的行。
 *
 * 站点的**主维度是用户**（会员展示），角色是「被用户绑定的东西」；
 * 所以两个视图都要能回答「绑没绑」，并且**职业/专精/职能以公会名单为准**。
 */

/** 数据库里取出来的角色（已 include guildMember）。 */
export type BoundChar = {
  id: string;
  name: string;
  server: string;
  isMain: boolean;
  class: string | null;
  spec: string | null;
  role: string | null;
  guildMemberId: string | null;
  guildMember: {
    className: string | null;
    specName: string | null;
    specRole: string | null;
    realmTitle: string;
    realmSlug: string;
  } | null;
};

export type RosterUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  guildRank: string;
  referredById: string | null;
  characters: BoundChar[];
};

export type GuildMemberRow = {
  id: string;
  characterName: string;
  realmTitle: string;
  realmSlug: string;
  className: string | null;
  specName: string | null;
  specRole: string | null;
  rank: number | null;
  characters: {
    id: string;
    isMain: boolean;
    user: { id: string; name: string | null; email: string; guildRank: string } | null;
  }[];
};

export type DisplayChar = {
  id: string;
  name: string;
  /** 英文职业名（供配色与译名使用） */
  className: string | null;
  specName: string | null;
  specRole: string | null;
  realm: string;
  isMain: boolean;
  /** 是否已绑定公会名单 —— 用户与角色之间**只有这层关系** */
  bound: boolean;
};

export type MemberRow = {
  id: string;
  name: string;
  role: string;
  guildRank: string;
  main: DisplayChar | null;
  characterCount: number;
  boundCount: number;
};

export type CharacterRow = {
  id: string;
  name: string;
  realm: string;
  className: string | null;
  specName: string | null;
  specRole: string | null;
  rank: number | null;
  bound: boolean;
  isMain: boolean;
  owner: { name: string | null; guildRank: string } | null;
  boundCount: number;
};

/**
 * 摊平一个角色。
 *
 * - **职业/专精/职能以公会名单为准**：这些在 WTF 导入时就从 Raider.IO 拿到了，
 *   绑定之后直接可用，不需要管理员再手填；手工字段只作兜底。
 * - **服务器以当前字典为准**：字典可被管理员随时重刷，角色里存的是导入当时的名字。
 */
export function toDisplay(c: BoundChar, realmNameBySlug: Map<string, string>): DisplayChar {
  const gm = c.guildMember;
  return {
    id: c.id,
    name: c.name,
    className: gm?.className ?? c.class ?? null,
    specName: gm?.specName ?? c.spec ?? null,
    specRole: gm?.specRole ?? c.role ?? null,
    realm: gm ? realmNameBySlug.get(gm.realmSlug) ?? gm.realmTitle : c.server,
    isMain: c.isMain,
    bound: !!c.guildMemberId,
  };
}

/** 会员展示：以**用户**为行，带上主力角色（后端已把 isMain 排在前面）。 */
export function buildMemberRows(
  users: RosterUser[],
  realmNameBySlug: Map<string, string>
): MemberRow[] {
  return users.map((u) => {
    const list = u.characters.map((c) => toDisplay(c, realmNameBySlug));
    // 明确找 isMain，找不到才退回第一个 —— 不依赖排序的巧合
    const main = list.find((c) => c.isMain) ?? list[0] ?? null;
    return {
      id: u.id,
      name: u.name || u.email,
      role: u.role,
      guildRank: u.guildRank,
      main,
      characterCount: list.length,
      boundCount: list.filter((c) => c.bound).length,
    };
  });
}

/** 公会角色展示：以**角色**为行，带上隶属成员。 */
export function buildCharacterRows(
  guildMembers: GuildMemberRow[],
  realmNameBySlug: Map<string, string>
): CharacterRow[] {
  return guildMembers.map((g) => {
    // 同一角色理论上只能被一个站内角色绑定（@@unique(server,name) 保证），
    // 这里仍取主力优先，避免历史数据里出现多个时展示得随机
    const bound = g.characters.find((c) => c.isMain) ?? g.characters[0] ?? null;
    return {
      id: g.id,
      name: g.characterName,
      realm: realmNameBySlug.get(g.realmSlug) ?? g.realmTitle,
      className: g.className,
      specName: g.specName,
      specRole: g.specRole,
      rank: g.rank,
      bound: g.characters.length > 0,
      isMain: bound?.isMain ?? false,
      owner: bound?.user ? { name: bound.user.name, guildRank: bound.user.guildRank } : null,
      boundCount: g.characters.length,
    };
  });
}
