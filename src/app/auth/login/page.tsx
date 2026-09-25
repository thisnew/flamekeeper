"use client";

import { Suspense, useState } from "react";
import { signIn, getCsrfToken } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Flame, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

/** Reasons returned by auth.ts `authorize` via CredentialsSignin.code */
const CODE_MESSAGES: Record<string, string> = {
  missing_fields: "请输入邮箱和密码",
  user_not_found: "该邮箱尚未注册，请先注册账号",
  wrong_password: "密码错误，请重新输入",
  no_password: "该账号未设置密码，请联系官员",
  email_unverified: "邮箱尚未验证，请先完成邮箱验证",
  account_rejected: "你的入会申请已被拒绝，如有疑问请联系官员",
};

/** NextAuth-level error types (from the ?error= redirect / result.error) */
const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "登录失败：邮箱或密码不正确",
  MissingCSRF: "会话校验失败，请刷新页面后重试",
  AccessDenied: "访问被拒绝：账号未通过审批或已被停用",
  Verification: "验证链接无效或已过期，请重新获取",
  Configuration: "服务器认证配置错误，请联系管理员",
  UntrustedHost: "服务器未信任当前域名，请联系管理员",
};

function resolveMessage(error?: string | null, code?: string | null): string | null {
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];
  if (error && ERROR_MESSAGES[error]) return ERROR_MESSAGES[error];
  if (error) return `登录失败：${error}`;
  return null;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const urlCode = searchParams.get("code");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** 错误码（如 email_unverified）—— 有它才能针对性地给出下一步入口 */
  const [submitErrorCode, setSubmitErrorCode] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError(null);

    try {
      // Step 1: explicitly fetch CSRF token (NextAuth v5 requirement)
      const csrfToken = await getCsrfToken();

      // Step 2: signIn with redirect:false so we can show errors inline.
      // redirectTo MUST be set — otherwise NextAuth uses the current page
      // (the login page) as the callback and we bounce back to /auth/login.
      const result = await signIn("credentials", {
        email,
        password,
        csrfToken,
        redirect: false,
        redirectTo: "/",
      });

      if (!result) {
        const msg = "登录请求失败，请重试";
        setSubmitError(msg);
        toast.error(msg);
        return;
      }

      if (result.error || result.code) {
        const code = (result as any).code ?? result.error ?? null;
        const msg =
          resolveMessage(result.error, (result as any).code) || "登录失败，请稍后再试";
        setSubmitError(msg);
        setSubmitErrorCode(code);
        toast.error(msg);
        return;
      }

      if (!result.ok) {
        const msg = "登录失败，请稍后再试";
        setSubmitError(msg);
        toast.error(msg);
        return;
      }

      // Step 3: success — toast + go to the home page with a full reload.
      // We MUST use window.location (not router.push) because the Header reads
      // the session via server-side auth() in layout.tsx; a client-side
      // navigation would keep the old (anonymous) server-rendered Header.
      toast.success("登录成功，正在进入...");
      window.location.replace("/");
    } catch (err) {
      console.error("Login error:", err);
      const msg = err instanceof Error ? err.message : "登录失败，请稍后再试";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const urlMessage = resolveMessage(urlError, urlCode);
  const errorMessage = submitError || urlMessage;
  // 邮箱未验证时给一条自助出路（见下方渲染处）
  const isUnverified =
    submitErrorCode === "email_unverified" ||
    urlError === "email_unverified" ||
    urlCode === "email_unverified";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bg-card border-2 border-wow-gold shadow-gold mb-4">
            <Flame className="w-8 h-8 text-wow-orange" />
          </div>
          <h1 className="font-display text-2xl font-bold text-wow-gold text-glow">登录</h1>
          <p className="text-sm text-text-muted mt-2">欢迎回到 Eternal Flame</p>
        </div>

        {/* Form */}
        <div className="bg-bg-card border border-border-default rounded p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                autoComplete="email"
                className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">密码</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "登录中..." : "登录"}
            </button>
          </form>

          {errorMessage && (
            <div className="mt-4 p-3 bg-wow-red/10 border border-wow-red/30 rounded text-sm text-wow-red flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                登录失败：{errorMessage}
                {/* 邮箱未验证是唯一「能自助解决」的失败原因 —— 不给出路的话
                    用户只知道被拦了，却没法重发验证邮件（/auth/verify-email
                    无需 token 也能打开，那里就有重发表单）。 */}
                {isUnverified && (
                  <>
                    {" "}
                    <Link href="/auth/verify-email" className="underline font-bold hover:text-wow-red/80">
                      重新发送验证邮件 →
                    </Link>
                  </>
                )}
              </span>
            </div>
          )}

          <div className="mt-4 text-center">
            <Link href="/auth/forgot-password" className="text-xs text-text-muted hover:text-wow-gold">
              忘记密码？
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-text-muted mt-6">
          还没有账号？{" "}
          <Link href="/auth/register" className="text-wow-gold hover:underline">
            注册加入公会
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-wow-gold" /></div>}>
      <LoginForm />
    </Suspense>
  );
}