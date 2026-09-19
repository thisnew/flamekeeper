import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Puzzle, Download, Copy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "插件库",
  description: "Eternal Flame 公会精选插件推荐、WeakAuras 字符串与配置教程。",
};

const CATEGORY_LABELS: Record<string, string> = {
  RAID: "团本",
  MPLUS: "大秘境",
  PVP: "PVP",
  UI: "界面美化",
  CLASS: "职业专精",
  WEAKAURA: "WeakAuras",
  MACRO: "宏命令",
  TOOL: "工具",
};

async function getAddons() {
  try {
    return await prisma.addon.findMany({
      orderBy: [{ isRecommended: "desc" }, { name: "asc" }],
    });
  } catch {
    return [];
  }
}

export default async function AddonsPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const addons = await getAddons();

  return (
    <div className="page-enter">
      <section className="py-16 border-b border-border-default bg-gradient-to-b from-bg-secondary/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Puzzle className="w-12 h-12 text-wow-gold mx-auto mb-4" />
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-wow-gold text-glow mb-4">
            插件库
          </h1>
          <p className="text-text-secondary max-w-xl mx-auto">
            精选插件推荐、WeakAuras 字符串与宏命令配置教程
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {addons.length === 0 ? (
            <div className="text-center py-20 text-text-muted border border-border-default rounded bg-bg-card">
              <Puzzle className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>插件库正在建设中，敬请期待...</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {addons.map((addon) => (
                <Link
                  key={addon.id}
                  href={`/addons/${addon.slug}`}
                  className="block bg-bg-card border border-border-default rounded p-6 hover:border-border-gold transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs px-2 py-0.5 bg-wow-gold/10 text-wow-gold border border-border-gold rounded">
                      {CATEGORY_LABELS[addon.category] || addon.category}
                    </span>
                    {addon.isRecommended && (
                      <span className="text-xs px-2 py-0.5 bg-wow-orange/10 text-wow-orange border border-wow-orange/30 rounded">
                        推荐
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-text-primary mb-2 hover:text-wow-gold transition-colors">{addon.name}</h3>
                  <p className="text-sm text-text-muted mb-4 line-clamp-2">{addon.description}</p>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    {addon.downloadUrl && (
                      <span className="flex items-center gap-1 text-wow-blue-light">
                        <Download className="w-3 h-3" /> 下载
                      </span>
                    )}
                    {addon.waString && (
                      <span className="flex items-center gap-1 text-wow-purple">
                        <Copy className="w-3 h-3" /> WA
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}