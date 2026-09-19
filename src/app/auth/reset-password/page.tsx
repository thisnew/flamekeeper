import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { findValidResetToken } from "@/lib/password-reset";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

// 令牌随时可能过期或被用掉，这个页面绝不能静态化
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = params.token;
  const token = Array.isArray(raw) ? raw[0] : raw;

  // 服务端先校验一次令牌：无效就根本不给渲染表单的机会
  const record = token ? await findValidResetToken(token) : null;

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
          重置密码
        </h1>

        {record ? (
          <>
            <p className="text-sm text-text-muted mb-6">
              正在为 <span className="text-wow-gold">{record.user.email}</span> 设置新密码。
            </p>
            <div className="bg-bg-card border border-border-default rounded p-6">
              <ResetPasswordForm token={token as string} />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-text-muted mb-6">
              这个重置链接无法使用。
            </p>
            <div className="bg-bg-card border border-border-default rounded p-6 space-y-4">
              <div className="p-3 bg-wow-red/10 border border-wow-red/30 rounded text-sm text-wow-red flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>链接无效、已过期，或已经被使用过了。</span>
              </div>
              <p className="text-xs text-text-muted">
                重置链接有效期 1 小时，且只能使用一次。请重新申请一封新邮件。
              </p>
              <Link
                href="/auth/forgot-password"
                className="block w-full py-2.5 bg-wow-gold text-black text-sm font-bold rounded hover:bg-wow-gold-bright transition-colors text-center"
              >
                重新申请重置链接
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
