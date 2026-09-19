"use client";

import { Suspense, useState } from "react";
import { signIn, getCsrfToken } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Flame, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "邮箱或密码错误",
  MissingCSRF: "会话校验失败，请刷新页面重试",
  AccessDenied: "账号未通过审核或已被禁用",
  Verification: "请先验证邮箱",
  Configuration: "服务器认证配置错误，请联系管理员",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const csrfToken = await getCsrfToken();

      const result = await signIn("credentials", {
        email,
        password,
        csrfToken,
        redirect: false,
      });

      if (!result) {
        toast.error("登录请求失败，请重试");
        return;
      }

      if (result.error) {
        toast.error(ERROR_MESSAGES[result.error] || `登录失败：${result.error}`);
        return;
      }

      if (result.ok) {
        toast.success("登录成功！");
        router.push("/");
        router.refresh();
      } else {
        toast.error("登录失败，请稍后再试");
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error(err instanceof Error ? err.message : "登录失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  const errorMessage = urlError ? (ERROR_MESSAGES[urlError] || urlError) : null;

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
              <span>登录失败：{errorMessage}</span>
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