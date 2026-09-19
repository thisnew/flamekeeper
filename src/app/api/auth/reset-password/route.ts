import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations";
import { findValidResetToken } from "@/lib/password-reset";

/** 与注册 / 改密保持一致的 bcrypt 成本因子。 */
const BCRYPT_ROUNDS = 12;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "输入有误" },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    const record = await findValidResetToken(token);
    if (!record) {
      // 不存在 / 已使用 / 已过期，统一回一句话（不区分，避免探测）
      return NextResponse.json(
        {
          error: "重置链接无效或已过期，请重新申请。",
          reason: "invalid_token",
        },
        { status: 400 }
      );
    }

    const passwordHash = await hash(password, BCRYPT_ROUNDS);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });

      // 一次性：标记本令牌已用
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      });

      // 作废其余所有未使用令牌 —— 旧邮件里的链接随即失效
      await tx.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: now },
      });

      await tx.auditLog.create({
        data: {
          userId: record.userId,
          action: "PASSWORD_RESET",
          detail: `通过邮件重置密码 (${record.user.email})`,
        },
      });
    });

    // 回传邮箱，前端可用于预填登录表单（持有令牌者本就知道该邮箱）
    return NextResponse.json({
      success: true,
      message: "密码已重置，请使用新密码登录。",
      email: record.user.email,
    });
  } catch (error) {
    console.error("[reset-password] 未预期错误:", error);
    return NextResponse.json({ error: "服务器错误，请稍后再试" }, { status: 500 });
  }
}
