import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole, isOfficerOrAboveRole } from "@/lib/roles";
import { guildRankOrder } from "@/lib/guild-rank";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import MembersClient, { type MemberRow } from "@/components/admin/MembersClient";

export const metadata: Metadata = { title: "成员与会阶 - 管理后台" };

export default async function AdminMembersPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id || !isOfficerOrAboveRole(user.role)) redirect("/auth/login");

  const rows = await prisma.user
    .findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        guildRank: true,
        referredById: true,
      },
    })
    .catch(() => []);

  // 按会阶排序（会长 → 团长 → 核心 → 成员），同会阶按昵称
  const members: MemberRow[] = [...rows].sort((a, b) => {
    const d = guildRankOrder(a.guildRank) - guildRankOrder(b.guildRank);
    if (d !== 0) return d;
    return (a.name || a.email).localeCompare(b.name || b.email, "zh-CN");
  });

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-wow-gold mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> 返回后台
      </Link>

      <h1 className="font-display text-2xl font-bold text-wow-gold text-glow mb-2">
        成员与会阶
      </h1>
      <p className="text-sm text-text-muted mb-8">
        会阶（会长 / 团长 / 核心 / 成员）是**公会内部身份**，与系统权限（能不能进后台）是两回事
        —— 管理员不等于会长。
        <br />
        引荐关系会显示在「成员名册 → 结构图」中，此处可调整。
      </p>

      <MembersClient initial={members} canEdit={isAdminRole(user.role)} />
    </div>
  );
}
