import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Flame, Clock, Mail, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMemberOrAboveRole } from "@/lib/roles";

export const metadata: Metadata = {
  title: "审核中",
  description: "你的入会申请正在审核中。",
};

const STATUS_INFO: Record<string, { icon: any; label: string; color: string; desc: string }> = {
  PENDING_EMAIL: {
    icon: Mail,
    label: "待邮箱验证",
    color: "text-wow-gold",
    desc: "请前往注册邮箱，点击我们发送的验证链接完成确认。",
  },
  PENDING_APPROVAL: {
    icon: Clock,
    label: "待审批",
    color: "text-wow-gold",
    desc: "你的申请已提交，已入会的公会成员均可为你审批，请耐心等待。",
  },
  NEEDS_INFO: {
    icon: AlertCircle,
    label: "需补充信息",
    color: "text-wow-orange",
    desc: "官员希望你补充一些资料，请联系审批人或重新提交申请。",
  },
  REJECTED: {
    icon: XCircle,
    label: "已拒绝",
    color: "text-wow-red",
    desc: "本次申请未通过。如有疑问请联系公会成员了解原因。",
  },
  APPROVED: {
    icon: CheckCircle,
    label: "已通过",
    color: "text-wow-green",
    desc: "你已经是公会成员了。",
  },
};

export default async function PendingPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id) redirect("/auth/login");

  // Already a member — send them to the roster
  if (isMemberOrAboveRole(user.role)) redirect("/roster");

  const [application, dbUser] = await Promise.all([
    prisma.application
      .findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
      })
      .catch(() => null),
    prisma.user.findUnique({ where: { id: user.id } }).catch(() => null),
  ]);

  // If the DB says they were approved, refresh the session by sending them in
  if (isMemberOrAboveRole(dbUser?.role)) redirect("/roster");

  const statusKey =
    dbUser?.status && STATUS_INFO[dbUser.status]
      ? dbUser.status
      : application?.status === "PENDING"
        ? "PENDING_APPROVAL"
        : (dbUser?.status ?? "PENDING_APPROVAL");

  const info = STATUS_INFO[statusKey] ?? STATUS_INFO.PENDING_APPROVAL;
  const Icon = info.icon;

  return (
    <div className="page-enter max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bg-card border-2 border-wow-gold shadow-gold mb-4">
          <Flame className="w-8 h-8 text-wow-orange" />
        </div>
        <h1 className="font-display text-2xl font-bold text-wow-gold text-glow">等待加入 Eternal Flame</h1>
        <p className="text-sm text-text-muted mt-2">
          公会内部内容（成员名册 · 工具分享 · 数据分析 · 活动日历）需要审批通过后才能访问
        </p>
      </div>

      <div className="bg-bg-card border border-border-default rounded p-6 mb-6">
        <div className="flex items-start gap-3">
          <Icon className={`w-6 h-6 ${info.color} shrink-0 mt-0.5`} />
          <div className="flex-1">
            <h2 className={`font-bold mb-1 ${info.color}`}>{info.label}</h2>
            <p className="text-sm text-text-secondary">{info.desc}</p>
          </div>
        </div>
      </div>

      {application && (
        <div className="bg-bg-card border border-border-default rounded p-6">
          <h3 className="font-display text-lg font-bold text-wow-gold mb-4">我的申请</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-bg-secondary/50 rounded p-3">
              <div className="text-xs text-text-muted">昵称</div>
              <div className="text-text-primary">{application.user.name || "（未设昵称）"}</div>
            </div>
            <div className="bg-bg-secondary/50 rounded p-3">
              <div className="text-xs text-text-muted">申请编号</div>
              <div className="text-text-primary font-mono text-xs">{application.applicationCode}</div>
            </div>
          </div>

          {/* 注册只填昵称，不再有角色/服务器等信息；角色在入会后导入 */}
          <p className="mt-4 text-xs text-text-muted">
            入会后可到「个人中心 → 角色管理」从游戏 WTF 配置导入你的角色。
          </p>
          {application.officerNote && (
            <p className="mt-4 text-sm text-wow-orange">审批备注：{application.officerNote}</p>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <Link
          href="/profile"
          className="px-6 py-2.5 bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright transition-colors"
        >
          个人中心
        </Link>
        <Link
          href="/guide"
          className="px-6 py-2.5 border border-border-gold text-wow-gold rounded hover:bg-bg-card transition-colors"
        >
          入会指南
        </Link>
        <Link
          href="/contact"
          className="px-6 py-2.5 border border-border-default text-text-muted rounded hover:text-text-primary transition-colors"
        >
          联系审批人
        </Link>
      </div>
    </div>
  );
}