import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Newspaper, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "信息发布",
  description: "Eternal Flame 公会最新公告、新闻、战报与活动通知。",
};

const CATEGORY_LABELS: Record<string, string> = {
  NEWS: "新闻",
  ANNOUNCEMENT: "公告",
  BATTLE_REPORT: "战报",
  EVENT: "活动",
  RECRUITMENT: "招募",
  MAINTENANCE: "维护",
};

async function getPosts() {
  try {
    return await prisma.post.findMany({
      where: { isPublished: true },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      include: { author: { select: { name: true, email: true } } },
    });
  } catch {
    return [];
  }
}

export default async function NewsPage() {
  const posts = await getPosts();

  return (
    <div className="page-enter">
      <section className="py-16 border-b border-border-default bg-gradient-to-b from-bg-secondary/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Newspaper className="w-12 h-12 text-wow-gold mx-auto mb-4" />
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-wow-gold text-glow mb-4">
            信息发布
          </h1>
          <p className="text-text-secondary">公会最新动态、公告与战报</p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {posts.length === 0 ? (
            <div className="text-center py-20 text-text-muted border border-border-default rounded bg-bg-card">
              <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>暂无发布内容</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/news/${post.slug}`}
                  className="block bg-bg-card border border-border-default rounded p-6 hover:border-border-gold hover:shadow-gold transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 bg-wow-gold/10 text-wow-gold border border-border-gold rounded">
                          {CATEGORY_LABELS[post.category] || post.category}
                        </span>
                        {post.isPinned && (
                          <span className="text-xs px-2 py-0.5 bg-wow-red/10 text-wow-red border border-wow-red/30 rounded">
                            置顶
                          </span>
                        )}
                      </div>
                      <h2 className="font-bold text-lg text-text-primary hover:text-wow-gold transition-colors mb-2">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-sm text-text-muted line-clamp-2">{post.excerpt}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-xs text-text-muted">
                        <span>{post.publishedAt ? formatDate(post.publishedAt) : ""}</span>
                        {post.author.name && <span>· {post.author.name}</span>}
                        <span>· {post.viewCount} 次阅读</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-text-muted shrink-0 mt-2" />
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