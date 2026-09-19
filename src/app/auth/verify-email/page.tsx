"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Flame, CheckCircle, XCircle, Loader2, Mail, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<"verifying" | "ok" | "error" | "idle">(
    token ? "verifying" : "idle"
  );
  const [message, setMessage] = useState("");

  // Resend form state
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.ok) {
          setState("ok");
          setMessage(data.message);
        } else {
          setState("error");
          setMessage(data.message || "验证失败");
        }
      } catch {
        if (!cancelled) {
          setState("error");
          setMessage("网络错误，请稍后重试");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const resend = async () => {
    if (!email.trim()) {
      toast.error("请输入注册时使用的邮箱");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "验证邮件已发送");
      } else {
        toast.error(data.error || "发送失败");
      }
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bg-card border-2 border-wow-gold shadow-gold mb-4">
            <Flame className="w-8 h-8 text-wow-orange" />
          </div>
          <h1 className="font-display text-2xl font-bold text-wow-gold text-glow">邮箱验证</h1>
        </div>

        <div className="bg-bg-card border border-border-default rounded p-6">
          {state === "verifying" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-8 h-8 animate-spin text-wow-gold" />
              <p className="text-sm text-text-muted">正在验证你的邮箱...</p>
            </div>
          )}

          {state === "ok" && (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-wow-green mx-auto mb-4" />
              <h2 className="font-bold text-text-primary mb-2">验证成功</h2>
              <p className="text-sm text-text-muted mb-6">{message}</p>
              <Link
                href="/auth/login"
                className="inline-block px-6 py-2.5 bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright transition-colors"
              >
                前往登录
              </Link>
            </div>
          )}

          {state === "error" && (
            <div className="text-center py-4">
              <XCircle className="w-12 h-12 text-wow-red mx-auto mb-4" />
              <h2 className="font-bold text-text-primary mb-2">验证失败</h2>
              <p className="text-sm text-text-muted mb-6">{message}</p>
              <div className="text-left">
                <label className="block text-sm text-text-secondary mb-1.5">重新发送验证邮件</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="注册时使用的邮箱"
                    className="flex-1 px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none text-sm"
                  />
                  <button
                    onClick={resend}
                    disabled={sending}
                    className="px-4 py-2 bg-wow-gold text-black font-bold text-sm rounded hover:bg-wow-gold-bright disabled:opacity-50 flex items-center gap-1"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    发送
                  </button>
                </div>
              </div>
            </div>
          )}

          {state === "idle" && (
            <div>
              <p className="text-sm text-text-secondary mb-4">
                还没有收到验证邮件？输入注册时使用的邮箱，我们会重新发送一封。
              </p>
              <label className="block text-sm text-text-secondary mb-1.5">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none mb-4"
              />
              <button
                onClick={resend}
                disabled={sending}
                className="w-full py-2.5 bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                重新发送验证邮件
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-text-muted mt-6">
          <Link href="/auth/login" className="inline-flex items-center gap-1 text-wow-gold hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> 返回登录
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-wow-gold" />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}