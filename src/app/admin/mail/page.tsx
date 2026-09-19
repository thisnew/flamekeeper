import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";
import { getMailConfig, isMailConfigured } from "@/lib/mailer";
import MailClient from "@/components/admin/MailClient";

export const metadata: Metadata = { title: "邮件群发 - 管理后台" };

async function getCounts() {
  try {
    const [USER, MEMBER, OFFICER, ADMIN, verified] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "MEMBER" } }),
      prisma.user.count({ where: { role: "OFFICER" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { emailVerified: { not: null } } }),
    ]);
    return { USER, MEMBER, OFFICER, ADMIN, verified };
  } catch {
    return { USER: 0, MEMBER: 0, OFFICER: 0, ADMIN: 0, verified: 0 };
  }
}

export default async function AdminMailPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id || !isAdminRole(user.role)) {
    redirect("/auth/login");
  }

  const [counts, configured, cfg] = await Promise.all([
    getCounts(),
    isMailConfigured(),
    getMailConfig(),
  ]);

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-wow-gold mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回后台
      </Link>
      <h1 className="font-display text-2xl font-bold text-wow-gold text-glow mb-2">邮件服务</h1>
      <p className="text-sm text-text-muted mb-8">SMTP 连接测试与会员群发</p>

      <MailClient configured={configured} smtpUser={cfg.user} counts={counts} />
    </div>
  );
}