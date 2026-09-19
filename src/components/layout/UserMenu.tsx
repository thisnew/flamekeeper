"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Menu, X, Flame, ChevronDown, User, LogOut, Shield, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { isMemberOrAboveRole } from "@/lib/roles";

interface SessionUser {
  id?: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

export default function UserMenu({
  user,
  scrolled,
}: {
  user: SessionUser | null;
  scrolled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isOfficer = user?.role === "OFFICER" || user?.role === "ADMIN";
  const isMember = isMemberOrAboveRole(user?.role);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/auth/login"
          className={cn(
            "px-4 py-1.5 text-sm transition-colors",
            scrolled ? "text-text-secondary hover:text-wow-gold" : "text-text-primary hover:text-wow-gold"
          )}
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
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded border border-border-gold bg-bg-card hover:bg-bg-card-hover transition-colors"
      >
        <User className="w-4 h-4 text-wow-gold" />
        <span className="text-sm text-text-primary">{user.name || user.email}</span>
        <ChevronDown className={cn("w-3 h-3 text-text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-bg-card border border-border-default rounded shadow-card py-1 z-20">
            <Link
              href="/profile"
              className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-wow-gold hover:bg-bg-card-hover"
              onClick={() => setOpen(false)}
            >
              <User className="w-4 h-4" /> 个人中心
            </Link>
            {isMember && (
              <Link
                href="/admin/applications"
                className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-wow-gold hover:bg-bg-card-hover"
                onClick={() => setOpen(false)}
              >
                <ClipboardCheck className="w-4 h-4" /> 入会审批
              </Link>
            )}
            {isOfficer && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-wow-gold hover:bg-bg-card-hover"
                onClick={() => setOpen(false)}
              >
                <Shield className="w-4 h-4" /> 管理后台
              </Link>
            )}
            <hr className="border-border-default my-1" />
            <button
              onClick={() => {
                setOpen(false);
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
  );
}