import Link from "next/link";
import { Flame, Heart } from "lucide-react";

interface SessionUser {
  id?: string;
  email?: string | null;
  name?: string | null;
  role?: string;
  status?: string;
}

export default function Footer({ user }: { user: SessionUser | null }) {
  const isLoggedIn = !!user;

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
              <span className="font-display font-bold text-lg text-wow-gold">ETERNAL FLAME</span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              薪火不灭，荣耀永燃
            </p>
            <p className="text-xs text-text-muted mt-2">
              © {new Date().getFullYear()} Eternal Flame Guild. All rights reserved.
            </p>
          </div>

          {/* Nav links */}
          <div>
            <h4 className="font-display text-sm text-wow-gold mb-3 tracking-wider">导航</h4>
            <div className="flex flex-col gap-1.5">
              <Link href="/news" className="text-sm text-text-muted hover:text-wow-gold transition-colors">信息发布</Link>
              <Link href="/guide" className="text-sm text-text-muted hover:text-wow-gold transition-colors">入会指南</Link>
              <Link href="/about" className="text-sm text-text-muted hover:text-wow-gold transition-colors">公会介绍</Link>
              {isLoggedIn && (
                <Link href="/roster" className="text-sm text-text-muted hover:text-wow-gold transition-colors">成员名册</Link>
              )}
              <Link href="/contact" className="text-sm text-text-muted hover:text-wow-gold transition-colors">联系我们</Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-display text-sm text-wow-gold mb-3 tracking-wider">资源</h4>
            <div className="flex flex-col gap-1.5">
              {isLoggedIn && (
                <>
                  <Link href="/addons" className="text-sm text-text-muted hover:text-wow-gold transition-colors">插件库</Link>
                  <Link href="/analytics" className="text-sm text-text-muted hover:text-wow-gold transition-colors">数据分析</Link>
                  <Link href="/events" className="text-sm text-text-muted hover:text-wow-gold transition-colors">活动日历</Link>
                </>
              )}
              <Link href="/gallery" className="text-sm text-text-muted hover:text-wow-gold transition-colors">媒体画廊</Link>
              {!isLoggedIn && (
                <Link href="/auth/register" className="text-sm text-wow-gold hover:text-wow-gold-bright transition-colors">
                  注册解锁成员内容 →
                </Link>
              )}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-sm text-wow-gold mb-3 tracking-wider">联系方式</h4>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-text-muted">KOOK 频道：coming soon</span>
              <span className="text-sm text-text-muted">微信群：联系官员加入</span>
              <Link href="/contact" className="text-sm text-wow-gold hover:underline mt-1">
                更多联系方式 →
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
          <span className="text-xs text-text-muted flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-wow-red" /> by Eternal Flame Dev Team
          </span>
        </div>
      </div>
    </footer>
  );
}