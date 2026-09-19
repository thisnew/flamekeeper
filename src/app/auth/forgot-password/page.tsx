import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/auth/login" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-wow-gold mb-6">
          <ArrowLeft className="w-4 h-4" /> 返回登录
        </Link>

        <h1 className="font-display text-2xl font-bold text-wow-gold text-glow mb-2">忘记密码</h1>
        <p className="text-sm text-text-muted mb-6">输入你的注册邮箱，我们将发送密码重置链接。</p>

        <div className="bg-bg-card border border-border-default rounded p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">邮箱</label>
              <input
                type="email"
                className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none"
                placeholder="your@email.com"
              />
            </div>
            <button className="w-full py-2.5 bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright transition-colors">
              发送重置链接
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-text-muted mt-4">
          密码重置功能将在未来版本中启用。如遇问题请联系官员。
        </p>
      </div>
    </div>
  );
}