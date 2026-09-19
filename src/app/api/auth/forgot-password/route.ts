import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/app-url";
import { isMailConfigured, passwordResetEmailHtml, sendMail } from "@/lib/mailer";
import { forgotPasswordSchema } from "@/lib/validations";
import {
  RESET_REQUEST_WINDOW_MINUTES,
  RESET_TOKEN_TTL_MINUTES,
  generateResetToken,
  hashResetToken,
  invalidateUserResetTokens,
  isResetRateLimited,
  pruneStaleResetTokens,
} from "@/lib/password-reset";

// 无论账号是否存在，成功分支都返回同一句话 —— 防止用这个接口枚举已注册邮箱。
const GENERIC_MESSAGE =
  "如果该邮箱已注册，我们已发送重置密码的邮件，请查收（也可检查垃圾邮件）。";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "请输入有效的邮箱地址" },
        { status: 400 }
      );
    }

    // 邮件服务没配就不用往下走了。放在查账号之前，避免这一步泄露账号是否存在。
    if (!(await isMailConfigured())) {
      return NextResponse.json(
        { error: "邮件服务尚未配置，请联系公会官员" },
        { status: 503 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
    }

    // 频率限制。刻意也返回同样的成功文案（不提示「过于频繁」）：
    // 否则「存在该账号」会通过 429 暴露出来。服务端记日志即可。
    if (await isResetRateLimited(user.id)) {
      console.warn(`[forgot-password] 触发频率限制，已静默丢弃: ${email}`);
      return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
    }

    // 原始令牌只进邮件，库里只留 SHA-256 摘要
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000);

    // 先作废旧令牌，再写入新的 —— 保证任意时刻只有一条有效链接
    await invalidateUserResetTokens(user.id);
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashResetToken(token), expiresAt },
    });

    const resetUrl = `${appUrl()}/auth/reset-password?token=${token}`;
    const res = await sendMail({
      to: email,
      subject: "【Eternal Flame】重置你的密码",
      html: passwordResetEmailHtml({
        nickname: user.name || "",
        resetUrl,
        expiresMinutes: RESET_TOKEN_TTL_MINUTES,
      }),
    });

    if (!res.ok) {
      console.error("[forgot-password] 发信失败:", res.error);
      return NextResponse.json(
        { error: `重置邮件发送失败：${res.error || "未知原因"}` },
        { status: 502 }
      );
    }

    // 顺手清理历史令牌，best-effort
    pruneStaleResetTokens().catch((e) =>
      console.warn("[forgot-password] 清理历史令牌失败:", e?.message ?? e)
    );

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("[forgot-password] 未预期错误:", error);
    return NextResponse.json({ error: "服务器错误，请稍后再试" }, { status: 500 });
  }
}
