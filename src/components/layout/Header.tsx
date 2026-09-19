"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import UserMenu from "@/components/layout/UserMenu";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/news", label: "信息发布" },
  { href: "/guide", label: "入会指南" },
  { href: "/about", label: "公会介绍" },
  { href: "/roster", label: "成员名册" },
  { href: "/analytics", label: "数据分析" },
  { href: "/addons", label: "插件库" },
  { href: "/events", label: "活动日历" },
  { href: "/gallery", label: "画廊" },
];

interface SessionUser {
  id?: string;
  email?: string | null;
  name?: string | null;
  role?: string;
  status?: string;
}

export default function Header({
  user,
}: {
  user: SessionUser | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-bg-overlay backdrop-blur-md border-b border-border-gold shadow-gold"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Flame className="w-7 h-7 text-wow-orange group-hover:text-wow-gold transition-colors" />
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg text-wow-gold text-glow leading-tight">
                ETERNAL FLAME
              </span>
              <span className="text-xs text-text-muted leading-tight tracking-widest">
                守焰者
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 text-sm text-text-secondary hover:text-wow-gold transition-colors rounded hover:bg-bg-card"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Auth area (server-rendered session) */}
          <div className="hidden lg:flex items-center gap-2">
            <UserMenu user={user} scrolled={scrolled} />
          </div>

          {/* Mobile toggle */}
          <button
            className="lg:hidden p-2 text-text-secondary hover:text-wow-gold"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border-default bg-bg-secondary">
          <nav className="flex flex-col px-4 py-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="py-2.5 text-sm text-text-secondary hover:text-wow-gold border-b border-border-default last:border-0"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-3 pb-1">
              {user ? (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/profile"
                    className="text-sm text-wow-gold py-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    个人中心
                  </Link>
                  {(user.role === "OFFICER" || user.role === "ADMIN") && (
                    <Link
                      href="/admin"
                      className="text-sm text-wow-gold py-2"
                      onClick={() => setMobileOpen(false)}
                    >
                      管理后台
                    </Link>
                  )}
                  <a
                    href="/api/auth/signout"
                    className="text-sm text-wow-red py-2"
                  >
                    退出登录
                  </a>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/auth/login"
                    className="flex-1 py-2 text-center text-sm border border-border-gold text-wow-gold rounded"
                    onClick={() => setMobileOpen(false)}
                  >
                    登录
                  </Link>
                  <Link
                    href="/auth/register"
                    className="flex-1 py-2 text-center text-sm bg-wow-gold text-black font-medium rounded"
                    onClick={() => setMobileOpen(false)}
                  >
                    加入公会
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}