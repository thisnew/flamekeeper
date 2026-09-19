import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isMailConfigured, sendMail, verificationEmailHtml } from "@/lib/mailer";
import { appUrl } from "@/lib/app-url";

const TOKEN_TTL_HOURS = 24;

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond with a generic message to avoid account enumeration,
    // unless we can positively tell the user what to do next.
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "如果该邮箱已注册，我们已重新发送验证邮件，请查收。",
      });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: "该邮箱已经验证过了，请直接登录。",
      });
    }

    if (!(await isMailConfigured())) {
      return NextResponse.json(
        { error: "邮件服务尚未配置，请联系公会官员" },
        { status: 503 }
      );
    }

    const token = randomBytes(32).toString("hex");
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000),
      },
    });

    const verifyUrl = `${appUrl()}/auth/verify-email?token=${token}`;
    const res = await sendMail({
      to: email,
      subject: "【Eternal Flame】请确认你的邮箱",
      html: verificationEmailHtml({
        nickname: user.name || "",
        verifyUrl,
        expiresHours: TOKEN_TTL_HOURS,
        appUrl: appUrl(),
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `验证邮件发送失败：${res.error || "未知原因"}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "验证邮件已重新发送，请查收（若未收到请检查垃圾邮件）。",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "服务器错误，请稍后再试" }, { status: 500 });
  }
}