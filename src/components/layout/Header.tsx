"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Menu, X, Flame, ChevronDown, User, LogOut, Shield, Settings } from "lucide-react";

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

export default function Header() {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const user = session?.user as any;
  const isOfficer = user?.role === "OFFICER" || user?.role === "ADMIN";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
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

          {/* Auth area */}
          <div className="hidden lg:flex items-center gap-2">
            {status === "loading" ? (
              <div className="w-20 h-8 bg-bg-card animate-pulse rounded" />
            ) : session ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded border border-border-gold bg-bg-card hover:bg-bg-card-hover transition-colors"
                >
                  <User className="w-4 h-4 text-wow-gold" />
                  <span className="text-sm text-text-primary">{user?.name || user?.email}</span>
                  <ChevronDown className={cn("w-3 h-3 text-text-muted transition-transform", userMenuOpen && "rotate-180")} />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-bg-card border border-border-default rounded shadow-card py-1 z-20">
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-wow-gold hover:bg-bg-card-hover"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="w-4 h-4" /> 个人中心
                      </Link>
                      {isOfficer && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-wow-gold hover:bg-bg-card-hover"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Shield className="w-4 h-4" /> 管理后台
                        </Link>
                      )}
                      <hr className="border-border-default my-1" />
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          signOut({ callbackUrl: "/" });
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-wow-red hover:bg-bg-card-hover"
                      >
                        <LogOut className="w-4 h-4" /> 退出登录
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="px-4 py-1.5 text-sm text-text-secondary hover:text-wow-gold transition-colors"
                >
                  登录
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-1.5 text-sm bg-wow-gold text-black font-medium rounded hover:bg-wow-gold-bright transition-colors"
                >
                  加入公会
                </Link>
              </div>
            )}
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
              {session ? (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/profile"
                    className="text-sm text-wow-gold py-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    个人中心
                  </Link>
                  {isOfficer && (
                    <Link
                      href="/admin"
                      className="text-sm text-wow-gold py-2"
                      onClick={() => setMobileOpen(false)}
                    >
                      管理后台
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="text-sm text-wow-red py-2 text-left"
                  >
                    退出登录
                  </button>
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