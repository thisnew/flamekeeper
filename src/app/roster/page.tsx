import { Metadata } from "next";
import { Shield } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/page-guard";
import { guildRankOrder } from "@/lib/guild-rank";
import type { TreeNode } from "@/components/guild/ReferralTree";
import RosterTabs from "@/components/guild/RosterTabs";

import {
  buildCharacterRows,
  toDisplay,
  buildMemberRows,
  type BoundChar,
  type GuildMemberRow,
  type RosterUser,
} from "@/lib/roster-view";
export const metadata: Metadata = {
  title: "成员名册",
  description: "查看 Eternal Flame 公会成员名单，职业、专精、进度与引荐结构。",
};

async function getRosterData() {
  try {
    const [users, guildMembers] = await Promise.all([
      prisma.user.findMany({
        where: { role: { in: ["MEMBER", "OFFICER", "ADMIN"] } },
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          guildRank: true,
          referredById: true,
          characters: {
            // userId 非空也要卡：正常删号会连带删角色，但万一有历史孤儿
            // （userId = null）残留，绝不能出现在成员名册上。
            where: { isPublic: true, userId: { not: null } },
            // 主力排最前 —— 会员维度展示的就是主力
            orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }],
            select: {
              id: true,
              name: true,
              server: true,
              isMain: true,
              status: true,
              itemLevel: true,
              class: true,
              spec: true,
              role: true,
              guildMemberId: true,
              // ⚠ 职业/专精/职能**以公会名单为准** —— 那是 WTF 导入时从
              //   Raider.IO 一并拿到的，比手工填的可靠；手工字段只作兜底。
              guildMember: {
                select: {
                  className: true,
                  specName: true,
                  specRole: true,
                  realmTitle: true,
                  realmSlug: true,
                },
              },
            },
          },
        },
      }),
      // 公会角色展示：整份公会名单，谁绑定了、谁还没人认领一目了然
      prisma.guildMember.findMany({
        orderBy: [{ rank: "asc" }, { characterName: "asc" }],
        select: {
          id: true,
          characterName: true,
          realmTitle: true,
          realmSlug: true,
          className: true,
          specName: true,
          specRole: true,
          rank: true,
          characters: {
            where: { isPublic: true, userId: { not: null } },
            select: {
              id: true,
              isMain: true,
              user: { select: { id: true, name: true, email: true, guildRank: true } },
            },
          },
        },
      }),
    ]);

    // ⚠ **服务器名以当前字典为准**：字典是管理员可随时重刷的，
    //   角色记录里存的是导入当时的名字，字典更新后可能已经变了。
    const slugs = [
      ...new Set(guildMembers.map((g) => g.realmSlug)),
    ];
    const realmRows = slugs.length
      ? await prisma.gameRealm.findMany({
          where: { slug: { in: slugs } },
          select: { slug: true, name: true },
        })
      : [];
    const realmNameBySlug = new Map(realmRows.map((r) => [r.slug, r.name]));

    return { users, guildMembers, realmNameBySlug };
  } catch (error) {
    console.error("getRosterData error:", error);
    return { users: [], guildMembers: [], realmNameBySlug: new Map<string, string>() };
  }
}


/** Build the referral forest (parent = the member who approved you). */
function buildReferralForest(
  users: RosterUser[],
  realmNameBySlug: Map<string, string>
): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  for (const u of users) {
    // 会员维度展示**主力**：明确找 isMain，不依赖排序的巧合
    const main = u.characters.find((c) => c.isMain) ?? u.characters[0];
    const d = main ? toDisplay(main, realmNameBySlug) : null;
    nodes.set(u.id, {
      id: u.id,
      name: u.name || u.email,
      role: u.role,
      guildRank: u.guildRank,
      email: u.email,
      // ReferralTree 需要英文职业名来配色/译名
      character: d ? { name: d.name, class: d.className, spec: d.specName, role: d.specRole } : null,
      children: [],
    });
  }

  const roots: TreeNode[] = [];
  for (const u of users) {
    const node = nodes.get(u.id)!;
    const parent = u.referredById ? nodes.get(u.referredById) : undefined;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  }

  // Guard against cycles: keep only reachable nodes from real roots,
  // promoting any orphaned node to a root so nobody disappears.
  const seen = new Set<string>();
  const ordered: TreeNode[] = [];
  const dfs = (node: TreeNode) => {
    if (seen.has(node.id)) {
      node.children = [];
      return;
    }
    seen.add(node.id);
    node.children = node.children.filter((c) => !seen.has(c.id) && c.id !== node.id);
    for (const c of node.children) dfs(c);
    ordered.push(node);
  };
  for (const r of roots) dfs(r);
  for (const u of users) {
    if (!seen.has(u.id)) {
      const node = nodes.get(u.id)!;
      node.children = [];
      seen.add(u.id);
      roots.push(node);
    }
  }

  const sortNodes = (arr: TreeNode[]) => {
    arr.sort(
      (a, b) =>
        guildRankOrder(a.guildRank) - guildRankOrder(b.guildRank) ||
        String(a.name).localeCompare(String(b.name), "zh-CN")
    );
    arr.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}

export default async function RosterPage() {
  await requireMember();

  const { users, guildMembers, realmNameBySlug } = await getRosterData();
  const treeRoots = buildReferralForest(users as RosterUser[], realmNameBySlug);

  // 两个维度都从纯函数来 —— 见 lib/roster-view.ts
  const members = buildMemberRows(users as RosterUser[], realmNameBySlug);
  const guildCharacters = buildCharacterRows(
    guildMembers as GuildMemberRow[],
    realmNameBySlug
  );

  return (
    <div className="page-enter">
      <section className="py-16 border-b border-border-default bg-gradient-to-b from-bg-secondary/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Shield className="w-12 h-12 text-wow-gold mx-auto mb-4" />
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-wow-gold text-glow mb-4">
            成员名册
          </h1>
          <p className="text-text-secondary">
            以成员为主 · 共 {members.length} 位成员、{guildCharacters.length} 个公会角色
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <RosterTabs
            members={members}
            guildCharacters={guildCharacters}
            treeRoots={treeRoots}
          />
        </div>
      </section>
    </div>
  );
}