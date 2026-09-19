import { Flame, Shield, Swords, Users, ArrowRight, Star, ChevronRight } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

async function getHomeData() {
  const [posts, characters, raidProgress] = await Promise.all([
    prisma.post.findMany({
      where: { isPublished: true },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      take: 3,
    }),
    prisma.character.count({ where: { isPublic: true } }),
    prisma.raidProgress.findMany({
      orderBy: { defeatedAt: "desc" },
      take: 5,
    }),
  ]);

  return { posts, memberCount: characters, raidProgress };
}

export default async function HomePage() {
  const { posts, memberCount, raidProgress } = await getHomeData();

  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-bg-primary via-bg-primary/95 to-bg-primary" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(240,184,35,0.06)_0%,transparent_70%)]" />

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          {/* Guild emblem area */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-bg-card border-2 border-wow-gold shadow-gold-strong mb-8 animate-pulse-gold">
            <Flame className="w-12 h-12 text-wow-orange" />
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-black text-wow-gold text-glow tracking-wider mb-4">
            ETERNAL FLAME
          </h1>

          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-wow-gold/50" />
            <span className="font-display text-xl sm:text-2xl text-text-secondary tracking-widest">
              守焰者
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-wow-gold/50" />
          </div>

          <p className="text-lg sm:text-xl text-text-secondary mb-2 font-light">
            薪火不灭，荣耀永燃
          </p>
          <p className="text-sm text-text-muted max-w-lg mx-auto mb-10">
            一个以团队副本为核心、注重成员成长的魔兽世界公会。
            我们是火焰的守护者，也是彼此的战友。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/guide"
              className="group px-8 py-3 bg-wow-gold text-black font-bold text-sm rounded hover:bg-wow-gold-bright transition-all shadow-gold"
            >
              加入我们
              <ArrowRight className="inline ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/about"
              className="px-8 py-3 border border-border-gold text-wow-gold text-sm rounded hover:bg-bg-card transition-colors"
            >
              了解公会
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative z-10 -mt-16 pb-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-bg-card border border-border-default rounded p-6 text-center wow-border">
              <Users className="w-6 h-6 text-wow-gold mx-auto mb-2" />
              <div className="text-2xl font-bold text-wow-gold">{memberCount}</div>
              <div className="text-xs text-text-muted mt-1">公会成员</div>
            </div>
            <div className="bg-bg-card border border-border-default rounded p-6 text-center">
              <Swords className="w-6 h-6 text-wow-gold mx-auto mb-2" />
              <div className="text-2xl font-bold text-wow-gold">{raidProgress.length}</div>
              <div className="text-xs text-text-muted mt-1">Boss 击杀</div>
            </div>
            <div className="bg-bg-card border border-border-default rounded p-6 text-center">
              <Star className="w-6 h-6 text-wow-gold mx-auto mb-2" />
              <div className="text-2xl font-bold text-wow-gold">--</div>
              <div className="text-xs text-text-muted mt-1">当前进度</div>
            </div>
            <div className="bg-bg-card border border-border-default rounded p-6 text-center">
              <Shield className="w-6 h-6 text-wow-gold mx-auto mb-2" />
              <div className="text-2xl font-bold text-wow-green">招募中</div>
              <div className="text-xs text-text-muted mt-1">招募状态</div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest News */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-wow-gold text-glow">最新发布</h2>
              <p className="text-sm text-text-muted mt-1">公会公告、战报与活动通知</p>
            </div>
            <Link
              href="/news"
              className="flex items-center gap-1 text-sm text-wow-gold hover:underline"
            >
              查看全部 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-12 text-text-muted border border-border-default rounded bg-bg-card">
              <Swords className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>暂无发布内容，敬请期待</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/news/${post.slug}`}
                  className="group bg-bg-card border border-border-default rounded p-6 hover:border-border-gold hover:shadow-gold transition-all"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-0.5 bg-wow-gold/10 text-wow-gold border border-border-gold rounded">
                      {post.category === "NEWS" ? "新闻" :
                       post.category === "ANNOUNCEMENT" ? "公告" :
                       post.category === "BATTLE_REPORT" ? "战报" :
                       post.category === "RECRUITMENT" ? "招募" : post.category}
                    </span>
                    {post.isPinned && (
                      <span className="text-xs px-2 py-0.5 bg-wow-red/10 text-wow-red border border-wow-red/30 rounded">置顶</span>
                    )}
                  </div>
                  <h3 className="font-bold text-text-primary group-hover:text-wow-gold transition-colors mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-sm text-text-muted line-clamp-2 mb-3">{post.excerpt}</p>
                  )}
                  <span className="text-xs text-text-muted">
                    {post.publishedAt ? formatDate(post.publishedAt) : ""}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Guild Features */}
      <section className="py-16 bg-bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-wow-gold text-glow text-center mb-12">
            公会服务
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Swords, title: "团队副本", desc: "固定团本活动，稳定Farm，开荒冲进度" },
              { icon: Users, title: "成员名册", desc: "查看公会成员职业、专精与进度" },
              { icon: Star, title: "插件库", desc: "精选插件推荐、WA字符串与配置教程" },
              { icon: Shield, title: "数据分析", desc: "职业分布、装等分布、出勤趋势" },
            ].map((feature, i) => (
              <div key={i} className="bg-bg-card border border-border-default rounded p-6 hover:border-border-gold transition-all">
                <feature.icon className="w-8 h-8 text-wow-gold mb-4" />
                <h3 className="font-bold text-text-primary mb-2">{feature.title}</h3>
                <p className="text-sm text-text-muted">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(240,184,35,0.08)_0%,transparent_70%)]" />
        <div className="relative z-10 text-center max-w-2xl mx-auto px-4">
          <Flame className="w-12 h-12 text-wow-orange mx-auto mb-6" />
          <h2 className="font-display text-3xl font-bold text-wow-gold text-glow mb-4">
            加入 Eternal Flame
          </h2>
          <p className="text-text-secondary mb-8">
            无论你是团队副本的核心成员、大秘境的冲层高手，
            还是刚踏入艾泽拉斯的新人冒险者，我们都欢迎你的加入。
          </p>
          <Link
            href="/guide"
            className="inline-flex items-center gap-2 px-10 py-3.5 bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright transition-all shadow-gold-strong"
          >
            <Swords className="w-5 h-5" />
            开始你的入会之旅
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}