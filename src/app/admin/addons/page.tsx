import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AddonsClient from "@/components/admin/AddonsClient";

export const metadata: Metadata = { title: "插件管理 - 管理后台" };

export default async function AdminAddonsPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user || (user.role !== "OFFICER" && user.role !== "ADMIN")) redirect("/auth/login");

  const addons = await prisma.addon.findMany({
    orderBy: [{ isRecommended: "desc" }, { name: "asc" }],
  }).catch(() => []);

  return (
    <div className="page-enter max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-wow-gold mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回后台
      </Link>
      <h1 className="font-display text-2xl font-bold text-wow-gold text-glow mb-8">插件库管理</h1>

      <AddonsClient initial={addons as any} />
    </div>
  );
}