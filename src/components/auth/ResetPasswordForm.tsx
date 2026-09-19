"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { resetPasswordSchema } from "@/lib/validations";

/** 由 /auth/reset-password 的服务端页面在令牌有效时渲染。 */
export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = resetPasswordSchema.safeParse({ token, password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "输入有误");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "重置失败，请重新申请");
        return;
      }
      setDone(true);
      toast.success("密码已重置");
      // 给用户看一眼成功提示，再送去登录页（带邮箱预填）
      const q = data.email ? `?email=${encodeURIComponent(data.email)}` : "";
      setTimeout(() => router.push(`/auth/login${q}`), 1800);
    } catch {
      setError("网络错误，请稍后再试");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-start gap-3 p-4 bg-wow-gold/5 border border-wow-gold/30 rounded">
        <CheckCircle2 className="w-5 h-5 text-wow-gold shrink-0 mt-0.5" />
        <div className="text-sm text-text-secondary">
          <p className="text-text-primary font-semibold mb-1">密码已重置</p>
          <p>正在前往登录页，请使用新密码登录。</p>
          <Link href="/auth/login" className="text-wow-gold hover:underline text-xs">
            没有自动跳转？点这里
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-text-secondary mb-1.5">新密码</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            autoComplete="new-password"
            autoFocus
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
        <p className="text-xs text-text-muted mt-1.5">至少 6 位，最长 72 个字符。</p>
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-1.5">确认新密码</label>
        <input
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
        {loading ? "提交中..." : "设置新密码"}
      </button>

      {error && (
        <div className="p-3 bg-wow-red/10 border border-wow-red/30 rounded text-sm text-wow-red flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}
