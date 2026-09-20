import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Shield, FileText, Users, Puzzle, CalendarDays, Image, Settings, BarChart3, ClipboardCheck, Mail, MessageSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "管理后台",
};

export default async function AdminPage() {
  const session = await auth();
  const user = session?.user as any;

  if (!user || (user.role !== "OFFICER" && user.role !== "ADMIN")) {
    redirect("/auth/login");
  }

  // 待审核评论数，直接显示在入口上 —— 否则很容易漏掉
  const pendingComments = await prisma.comment
    .count({ where: { status: "PENDING" } })
    .catch(() => 0);

  const adminLinks = [
    { href: "/admin/posts", icon: FileText, label: "信息发布管理", desc: "发布和编辑公告、新闻与战报" },
    { href: "/admin/applications", icon: ClipboardCheck, label: "入会审批", desc: "审核入会申请" },
    { href: "/admin/roster", icon: Users, label: "成员名册管理", desc: "管理公会成员资料" },
    { href: "/admin/addons", icon: Puzzle, label: "插件分享管理", desc: "管理插件、WA 字符串" },
    { href: "/admin/events", icon: CalendarDays, label: "活动管理", desc: "创建和管理公会活动" },
    { href: "/admin/gallery", icon: Image, label: "画廊管理", desc: "上传和管理图片视频" },
    {
      href: "/admin/comments",
      icon: MessageSquare,
      label: "评论审核",
      desc: "审核成员在文章下的评论",
      badge: pendingComments > 0 ? pendingComments : undefined,
    },
    ...(user.role === "ADMIN" ? [
      { href: "/admin/mail", icon: Mail, label: "邮件群发", desc: "SMTP 测试与会员群发邮件" },
      { href: "/admin/settings", icon: Settings, label: "系统设置", desc: "KOOK 链接、微信二维码、SMTP 等" },
    ] : []),
  ];

  return (
    <div className="page-enter">
      <section className="py-12 border-b border-border-default bg-gradient-to-b from-bg-secondary/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-wow-gold" />
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-wow-gold text-glow">
              管理后台
            </h1>
          </div>
          <p className="text-text-muted">
            欢迎，{user.name || user.email} · 角色：{user.role === "ADMIN" ? "管理员" : "官员"}
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="bg-bg-card border border-border-default rounded p-6 hover:border-border-gold hover:shadow-gold transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <link.icon className="w-8 h-8 text-wow-gold mb-3 group-hover:scale-110 transition-transform" />
                  {link.badge !== undefined && (
                    <span className="shrink-0 min-w-[1.5rem] text-center text-xs font-bold px-1.5 py-0.5 bg-wow-red/15 text-wow-red border border-wow-red/40 rounded">
                      {link.badge}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-text-primary mb-1">{link.label}</h3>
                <p className="text-sm text-text-muted">{link.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}