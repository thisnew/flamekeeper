import Link from "next/link";
import { Flame, Heart } from "lucide-react";
import { isMemberOrAboveRole } from "@/lib/roles";
import { getPublicSiteSettings } from "@/lib/site-settings";

interface SessionUser {
  id?: string;
  email?: string | null;
  name?: string | null;
  role?: string;
  status?: string;
}

/**
 * 页脚 —— 服务端组件。
 *
 * 标语与公会名取自**站点设置**（`lib/site-settings.ts`，与后台「系统设置」同一份），
 * 不再硬编码 —— 之前后台改了标语，页脚纹丝不动。
 */
export default async function Footer({ user }: { user: SessionUser | null }) {
  // Member-only links require an approved member role, not just a session
  const isMember = isMemberOrAboveRole(user?.role);
  const site = await getPublicSiteSettings();
  // 构建期注入的版本号，见 next.config.ts 的 resolveGitSha()
  const gitSha = process.env.NEXT_PUBLIC_GIT_SHA || "unknown";

  return (
    <footer className="relative z-10 border-t border-border-gold bg-bg-secondary/50">
      {/* Decorative top line */}
      <div className="h-px bg-gradient-to-r from-transparent via-wow-gold/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-6 h-6 text-wow-orange" />
              <span className="font-display font-bold text-lg text-wow-gold">
                {site.guild_name}
              </span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">{site.footer_tagline}</p>
            <p className="text-xs text-text-muted mt-2">
              © {new Date().getFullYear()} {site.guild_name} Guild. All rights reserved.
            </p>
          </div>

          {/* Nav links */}
          <div>
            <h4 className="font-display text-sm text-wow-gold mb-3 tracking-wider">导航</h4>
            <div className="flex flex-col gap-1.5">
              <Link href="/news" className="text-sm text-text-muted hover:text-wow-gold transition-colors">信息发布</Link>
              <Link href="/guide" className="text-sm text-text-muted hover:text-wow-gold transition-colors">入会指南</Link>
              <Link href="/about" className="text-sm text-text-muted hover:text-wow-gold transition-colors">公会介绍</Link>
              {isMember && (
                <Link href="/roster" className="text-sm text-text-muted hover:text-wow-gold transition-colors">成员名册</Link>
              )}
              <Link href="/contact" className="text-sm text-text-muted hover:text-wow-gold transition-colors">联系我们</Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-display text-sm text-wow-gold mb-3 tracking-wider">资源</h4>
            <div className="flex flex-col gap-1.5">
              {isMember && (
                <>
                  <Link href="/tools" className="text-sm text-text-muted hover:text-wow-gold transition-colors">工具分享</Link>
                  <Link href="/analytics" className="text-sm text-text-muted hover:text-wow-gold transition-colors">数据分析</Link>
                  <Link href="/events" className="text-sm text-text-muted hover:text-wow-gold transition-colors">活动日历</Link>
                </>
              )}
              <Link href="/gallery" className="text-sm text-text-muted hover:text-wow-gold transition-colors">媒体画廊</Link>
              {!isMember && (
                <Link href="/auth/register" className="text-sm text-wow-gold hover:text-wow-gold-bright transition-colors">
                  注册解锁成员内容 →
                </Link>
              )}
            </div>
          </div>

          {/* Contact —— 只留一个跳转入口。具体的 KOOK / 微信群在 /contact 页，
              这里写死一份只会和那边不同步。 */}
          <div>
            <h4 className="font-display text-sm text-wow-gold mb-3 tracking-wider">联系方式</h4>
            <div className="flex flex-col gap-1.5">
              <Link
                href="/contact"
                className="text-sm text-wow-gold hover:text-wow-gold-bright hover:underline"
              >
                查看更多联系方式 →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border-default">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-xs text-text-muted">
            本网站与暴雪娱乐及网易公司无任何关联。World of Warcraft® 是暴雪娱乐的注册商标。
          </span>
          <span className="text-xs text-text-muted flex items-center gap-3">
            <span className="font-mono" title="当前部署的构建版本">
              版本 {gitSha}
            </span>
            <span className="flex items-center gap-1">
              Made with <Heart className="w-3 h-3 text-wow-red" /> by {site.guild_name} Dev Team
            </span>
          </span>
        </div>
      </div>
    </footer>
  );
}