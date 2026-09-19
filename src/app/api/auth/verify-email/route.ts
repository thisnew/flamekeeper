import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ ok: false, reason: "missing_token", message: "缺少验证令牌" }, { status: 400 });
    }

    const record = await prisma.verificationToken.findUnique({ where: { token } });

    if (!record) {
      // Token already used, or never existed
      const url = new URL(req.url);
      const email = url.searchParams.get("email");
      if (email) {
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (user?.emailVerified) {
          return NextResponse.json({ ok: true, alreadyVerified: true, message: "该邮箱已经验证过了，请直接登录。" });
        }
      }
      return NextResponse.json(
        { ok: false, reason: "invalid_token", message: "验证链接无效或已被使用，请重新获取验证邮件。" },
        { status: 400 }
      );
    }

    if (record.expires.getTime() < Date.now()) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
      return NextResponse.json(
        { ok: false, reason: "expired", message: "验证链接已过期，请重新获取验证邮件。" },
        { status: 400 }
      );
    }

    const email = record.identifier.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ ok: false, reason: "user_not_found", message: "账号不存在" }, { status: 404 });
    }

    if (user.emailVerified) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
      return NextResponse.json({ ok: true, alreadyVerified: true, message: "该邮箱已经验证过了，请直接登录。" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
          // Move from "awaiting email" to "awaiting officer approval"
          status: user.status === "PENDING_EMAIL" ? "PENDING_APPROVAL" : user.status,
        },
      });
      await tx.verificationToken.delete({ where: { token } });
    });

    return NextResponse.json({
      ok: true,
      message: "邮箱验证成功！你的入会申请已进入审批流程，请等待官员审核。",
    });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json({ ok: false, reason: "server_error", message: "服务器错误，请稍后再试" }, { status: 500 });
  }
}