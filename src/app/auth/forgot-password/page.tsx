"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { forgotPasswordSchema } from "@/lib/validations";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // 本地先校验一次，省掉明显无效的请求；服务端仍会再校验
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "请输入有效的邮箱地址");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: parsed.data.email }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "发送失败，请稍后再试");
        return;
      }
      setSent(true);
      toast.success("重置链接已发送");
    } catch {
      setError("网络错误，请稍后再试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-wow-gold mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> 返回登录
        </Link>

        <h1 className="font-display text-2xl font-bold text-wow-gold text-glow mb-2">
          忘记密码
        </h1>
        <p className="text-sm text-text-muted mb-6">
          输入你的注册邮箱，我们会发送一封重置密码的邮件。
        </p>

        <div className="bg-bg-card border border-border-default rounded p-6">
          {sent ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-wow-gold shrink-0 mt-0.5" />
                <div className="text-sm text-text-secondary leading-relaxed">
                  <p className="text-text-primary font-semibold mb-1">邮件已发送</p>
                  <p>
                    如果 <span className="text-wow-gold">{email}</span>{" "}
                    已注册，你会收到一封重置密码的邮件。请点击邮件中的链接设置新密码。
                  </p>
                </div>
              </div>

              <ul className="text-xs text-text-muted space-y-1 list-disc pl-5">
                <li>
                  链接 <strong className="text-text-secondary">1 小时</strong>内有效，且只能使用一次。
                </li>
                <li>没收到？请检查垃圾邮件，或确认邮箱是否已注册。</li>
                <li>同一账号 15 分钟内最多申请 3 次，超出后不会重复发信。</li>
              </ul>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setError(null);
                  }}
                  className="flex-1 py-2.5 bg-bg-secondary border border-border-default text-text-secondary text-sm rounded hover:border-wow-gold hover:text-wow-gold transition-colors"
                >
                  换个邮箱重试
                </button>
                <Link
                  href="/auth/login"
                  className="flex-1 py-2.5 bg-wow-gold text-black text-sm font-bold rounded hover:bg-wow-gold-bright transition-colors text-center"
                >
                  返回登录
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    autoComplete="email"
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "发送中..." : "发送重置链接"}
              </button>

              {error && (
                <div className="p-3 bg-wow-red/10 border border-wow-red/30 rounded text-sm text-wow-red flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </form>
          )}
        </div>

        <p className="text-center text-xs text-text-muted mt-4">
          想不起来注册邮箱？请联系公会官员协助处理。
        </p>
      </div>
    </div>
  );
}
