import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SettingsClient from "@/components/admin/SettingsClient";

export const metadata: Metadata = { title: "设置 - 管理后台" };

export default async function AdminSettingsPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== "ADMIN") redirect("/admin");

  const rows = await prisma.setting.findMany().catch(() => []);
  const map: Record<string, string> = {};
  for (const s of rows) map[s.key] = s.value;

  const defaults = {
    site_title: "", site_description: "", guild_name: "", guild_chinese_name: "",
    guild_server: "", guild_faction: "", kook_invite_url: "", wechat_qr_image: "",
    recruitment_status: "招募中", officer_emails: "",
  };
  const initial = { ...defaults, ...map };

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