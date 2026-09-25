"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Flame, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { registerSchema } from "@/lib/validations";

/**
 * 注册：**只填昵称**（+ 邮箱 + 密码）。
 *
 * 角色/服务器/职业/专精等游戏信息不再在注册时收集 —— 那些由
 * 「个人中心 → 从 WTF 导入」产生，入会时不需要先有角色。
 */
export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    nickname: "",
    password: "",
    confirmPassword: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "输入有误");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "注册失败");
        return;
      }
      setDone(true);
      toast.success("注册成功");
    } catch {
      setError("网络错误，请稍后再试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-wow-gold mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> 返回首页
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bg-card border-2 border-wow-gold shadow-gold mb-4">
            <Flame className="w-8 h-8 text-wow-orange" />
          </div>
          <h1 className="font-display text-2xl font-bold text-wow-gold text-glow">
            加入 Eternal Flame
          </h1>
          <p className="text-sm text-text-muted mt-2">
            填写邮箱与昵称即可提交入会申请
          </p>
        </div>

        <div className="bg-bg-card border border-border-default rounded p-6">
          {done ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-wow-gold shrink-0 mt-0.5" />
                <div className="text-sm text-text-secondary leading-relaxed">
                  <p className="text-text-primary font-semibold mb-1">申请已提交</p>
                  <p>
                    我们已向 <span className="text-wow-gold">{form.email}</span>{" "}
                    发送了一封确认邮件。请先点击邮件中的链接完成邮箱验证。
                  </p>
                </div>
              </div>

              <ul className="text-xs text-text-muted space-y-1 list-disc pl-5">
                <li>未验证邮箱<strong className="text-text-secondary">无法登录</strong>。</li>
                <li>验证通过后进入入会审批，任何已入会成员都可以为你审批。</li>
                <li>没收到？请检查垃圾邮件，或到登录页重新发送验证邮件。</li>
              </ul>

              <Link
                href="/auth/login"
                className="block w-full py-2.5 bg-wow-gold text-black text-sm font-bold rounded hover:bg-wow-gold-bright transition-colors text-center"
              >
                前往登录
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">邮箱</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  required
                  placeholder="your@email.com"
                  autoComplete="email"
                  className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1.5">昵称</label>
                <input
                  value={form.nickname}
                  onChange={(e) => set("nickname", e.target.value)}
                  required
                  maxLength={20}
                  placeholder="你希望被怎么称呼"
                  className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none transition-colors"
                />
                <p className="text-xs text-text-muted mt-1.5">
                  2–20 个字符。游戏角色在入会后到「个人中心 → 角色管理」自行导入。
                </p>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1.5">密码</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 pr-10 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1.5">确认密码</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "提交中..." : "提交入会申请"}
              </button>

              {error && (
                <p className="p-3 bg-wow-red/10 border border-wow-red/30 rounded text-sm text-wow-red">
                  {error}
                </p>
              )}
            </form>
          )}
        </div>

        <p className="text-center text-sm text-text-muted mt-6">
          已经有账号？{" "}
          <Link href="/auth/login" className="text-wow-gold hover:underline">
            前往登录
          </Link>
        </p>
      </div>
    </div>
  );
}
