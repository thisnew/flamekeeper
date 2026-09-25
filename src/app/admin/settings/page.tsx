import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SettingsClient from "@/components/admin/SettingsClient";
import { PUBLIC_SITE_DEFAULTS } from "@/lib/site-settings";

export const metadata: Metadata = { title: "设置 - 管理后台" };

const MASKED = "********";

export default async function AdminSettingsPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id || user.role !== "ADMIN") redirect("/admin");

  const rows = await prisma.setting.findMany().catch(() => []);
  const map: Record<string, string> = {};
  for (const s of rows) map[s.key] = s.value;

  const defaults: Record<string, string> = {
    // ---- 公开可见的站点信息：默认值来自 lib/site-settings.ts，
    //      页脚与首页读的是同一份，避免后台改了而站点上没变 ----
    ...PUBLIC_SITE_DEFAULTS,
    // 后台专用（敏感，绝不走 getPublicSiteSettings）
    wechat_qr_image: "",
    officer_emails: "",
    // 评论先审后发（"false" 关闭）
    comment_moderation: "true",
    // mail / SMTP
    mail_enabled: "true",
    smtp_host: "smtp.163.com",
    smtp_port: "465",
    smtp_secure: "true",
    smtp_user: "",
    smtp_pass: "",
    smtp_from_name: "Eternal Flame 守焰者",
  };

  const initial: Record<string, string> = { ...defaults, ...map };
  // Never send the real password to the browser
  if (initial.smtp_pass) initial.smtp_pass = MASKED;
  if (initial.mail_enabled === "") initial.mail_enabled = "true";
  if (initial.smtp_secure === "") initial.smtp_secure = "true";

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-wow-gold mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回后台
      </Link>
      <h1 className="font-display text-2xl font-bold text-wow-gold text-glow mb-8">系统设置</h1>

      <SettingsClient initial={initial as any} />
    </div>
  );
}