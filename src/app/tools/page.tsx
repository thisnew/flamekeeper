import { Metadata } from "next";
import { Puzzle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/page-guard";
import { isMemberOrAboveRole } from "@/lib/roles";
import ToolsTabs from "@/components/tools/ToolsTabs";

export const metadata: Metadata = {
  title: "工具分享",
  description: "Eternal Flame 工具分享专栏：插件推荐、WeakAuras 字符串，以及成员分享的宏、配置与攻略。",
};

async function getToolsData() {
  try {
    const [addons, shares] = await Promise.all([
      prisma.addon.findMany({
        orderBy: [{ isRecommended: "desc" }, { name: "asc" }],
      }),
      prisma.post.findMany({
        where: { category: "SHARING", isPublished: true },
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
        include: { author: { select: { name: true, email: true } } },
      }),
    ]);
    return { addons, shares };
  } catch (error) {
    console.error("getToolsData error:", error);
    return { addons: [], shares: [] };
  }
}

export default async function ToolsPage() {
  const user = await requireMember();

  const { addons, shares } = await getToolsData();
  const canPublish = isMemberOrAboveRole(user.role);

  return (
    <div className="page-enter">
      <section className="py-16 border-b border-border-default bg-gradient-to-b from-bg-secondary/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Puzzle className="w-12 h-12 text-wow-gold mx-auto mb-4" />
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-wow-gold text-glow mb-4">
            工具分享
          </h1>
          <p className="text-text-secondary max-w-2xl mx-auto">
            公会插件精选、WeakAuras 字符串，以及成员分享的工具、宏、配置与攻略
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <ToolsTabs addons={addons as any} shares={shares as any} canPublish={canPublish} />
        </div>
      </section>
    </div>
  );
}