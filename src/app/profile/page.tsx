import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileCheck,
  Gamepad2,
  Mail,
  Shield,
  User,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/page-guard";
import { getWtfSummary } from "@/lib/wtf-summary";
import WtfManager from "@/components/profile/WtfManager";
import ChangePasswordForm from "./ChangePasswordForm";

export const metadata = {
  title: "个人中心 | Flamekeeper",
  description: "查看账号信息、管理我的角色与修改密码",
};

const ROLE_LABELS: Record<string, string> = {
  USER: "注册用户",
  MEMBER: "公会成员",
  OFFICER: "官员",
  ADMIN: "管理员",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_EMAIL: "待邮箱验证",
  PENDING_APPROVAL: "待审批",
  APPROVED: "已通过",
  REJECTED: "已拒绝",
  NEEDS_INFO: "需补充信息",
};

/**
 * 个人中心。
 *
 * ⚠ **必须是服务端组件**：数据在这里查好、以 props 传给 `WtfManager`，
 * 子组件里操作完调 `router.refresh()` 才会**重新执行本组件**、重新查库。
 *
 * 反面教材（曾经就是这样，导致「点完不刷新」）：
 *   页面写成 `"use client"` + `useState`，数据在 `useEffect` 里 fetch，
 *   effect 依赖只有 `[user?.id]` —— 子组件调 `router.refresh()` 时
 *   effect 依赖没变，**根本不会重跑**，界面永远停在旧数据上。
 *   凡是「子组件要刷新父页面数据」的场景，数据都必须来自服务端 props。
 */
export default async function ProfilePage() {
  const user = await requireMember();

  const [applications, wtf] = await Promise.all([
    // 已通过的申请不再展示 —— 审批通过后成员没必要再看一遍「已通过」，
    // 完整记录在「后台 → 入会审批」里管理员随时可查。
    prisma.application.findMany({
      where: { userId: user.id, status: { not: "APPROVED" } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        applicationCode: true,
        characterName: true,
        officerNote: true,
      },
    }),
    getWtfSummary(user.id),
  ]);

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-wow-gold mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> 返回首页
      </Link>

      <h1 className="font-display text-2xl font-bold text-wow-gold text-glow mb-8">个人中心</h1>

      {/* ---- 账号信息 ---- */}
      <div className="bg-bg-card border border-border-default rounded p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-bg-secondary border border-border-gold flex items-center justify-center">
            <User className="w-8 h-8 text-wow-gold" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-text-primary">{user.name || "未设置昵称"}</h2>
            <p className="text-sm text-text-muted flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> {user.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-bg-secondary/50 rounded p-4">
            <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
              <Shield className="w-4 h-4" /> 角色
            </div>
            <div className="font-bold text-wow-gold">
              {ROLE_LABELS[user.role ?? ""] || user.role}
            </div>
          </div>
          <div className="bg-bg-secondary/50 rounded p-4">
            <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
              <Clock className="w-4 h-4" /> 账号状态
            </div>
            <div className="font-bold text-wow-green">
              {STATUS_LABELS[user.status ?? ""] || user.status}
            </div>
          </div>
        </div>
      </div>

      {/* ---- 待处理申请（已通过的不占位）---- */}
      {applications.length > 0 && (
        <div className="bg-bg-card border border-border-default rounded p-6 mb-6">
          <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-wow-gold" /> 我的入会申请
          </h3>
          <div className="space-y-2">
            {applications.map((a) => (
              <div key={a.id} className="bg-bg-secondary/50 rounded p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text-primary">
                    {a.characterName || "入会申请"}
                  </span>
                  <span
                    className={`text-xs ${
                      a.status === "REJECTED"
                        ? "text-wow-red"
                        : a.status === "NEEDS_INFO"
                          ? "text-wow-orange"
                          : "text-wow-gold"
                    }`}
                  >
                    {a.status === "PENDING"
                      ? "待审批"
                      : a.status === "REJECTED"
                        ? "已拒绝"
                        : "需补充信息"}
                  </span>
                </div>
                <div className="text-xs text-text-muted mt-1">
                  申请编号：<code>{a.applicationCode}</code>
                </div>
                {a.officerNote && (
                  <div className="text-xs text-text-muted mt-1">官员备注：{a.officerNote}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- 我的角色 ---- */}
      <div className="bg-bg-card border border-border-default rounded p-6 mb-6">
        <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-wow-gold" /> 我的角色
        </h3>
        {/* WtfManager 是客户端组件；它操作完调 router.refresh() 会重新执行本
            服务端组件 → 重新查库 → 新 props 传下来，界面即时更新。 */}
        <WtfManager
          accounts={wtf.accounts}
          characters={wtf.characters}
          fileCount={wtf.fileCount}
          totalBytes={wtf.totalBytes}
        />
      </div>

      {/* ---- 修改密码 ---- */}
      <ChangePasswordForm />
    </div>
  );
}
