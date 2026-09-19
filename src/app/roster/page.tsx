import { Metadata } from "next";
import { Shield } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/page-guard";
import type { TreeNode } from "@/components/guild/ReferralTree";
import RosterTabs from "@/components/guild/RosterTabs";

export const metadata: Metadata = {
  title: "成员名册",
  description: "查看 Eternal Flame 公会成员名单，职业、专精、进度与引荐结构。",
};

const ROLE_ORDER: Record<string, number> = { ADMIN: 0, OFFICER: 1, MEMBER: 2 };

async function getRosterData() {
  try {
    const [characters, users] = await Promise.all([
      prisma.character.findMany({
        where: { isPublic: true },
        orderBy: [{ status: "asc" }, { name: "asc" }],
        select: {
          id: true, name: true, server: true, class: true, spec: true,
          role: true, itemLevel: true, status: true,
        },
      }),
      prisma.user.findMany({
        where: { role: { in: ["MEMBER", "OFFICER", "ADMIN"] } },
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: {
          id: true, name: true, email: true, role: true, referredById: true,
          characters: { select: { name: true, class: true, spec: true, role: true }, take: 1 },
        },
      }),
    ]);
    return { characters, users };
  } catch (error) {
    console.error("getRosterData error:", error);
    return { characters: [], users: [] };
  }
}

type RosterUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  referredById: string | null;
  characters: { name: string; class: string; spec: string; role: string }[];
};

/** Build the referral forest (parent = the member who approved you). */
function buildReferralForest(users: RosterUser[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  for (const u of users) {
    nodes.set(u.id, {
      id: u.id,
      name: u.name || u.email,
      role: u.role,
      email: u.email,
      character: u.characters[0] ?? null,
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
        (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) ||
        String(a.name).localeCompare(String(b.name), "zh-CN")
    );
    arr.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}

export default async function RosterPage() {
  await requireMember();

  const { characters, users } = await getRosterData();
  const treeRoots = buildReferralForest(users as RosterUser[]);

  return (
    <div className="page-enter">
      <section className="py-16 border-b border-border-default bg-gradient-to-b from-bg-secondary/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Shield className="w-12 h-12 text-wow-gold mx-auto mb-4" />
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-wow-gold text-glow mb-4">
            成员名册
          </h1>
          <p className="text-text-secondary">守护火焰的勇士们 · 名册与引荐结构</p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <RosterTabs characters={characters as any} treeRoots={treeRoots} />
        </div>
      </section>
    </div>
  );
}