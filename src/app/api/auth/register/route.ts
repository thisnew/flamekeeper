import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { isMailConfigured, sendMail, verificationEmailHtml } from "@/lib/mailer";
import { appUrl } from "@/lib/app-url";

const TOKEN_TTL_HOURS = 24;

async function createVerificationToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

  // Clear previous tokens for this identifier, then issue a fresh one
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  });
  return token;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "输入数据无效", details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { password, nickname, characterName, server, faction, class: wowClass, spec, itemLevel, raidExperience, playableTimes, kookId, wechatId } = validated.data;
    const email = validated.data.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "该邮箱已被注册" }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);
    const applicationCode = `EF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: nickname,
        role: "USER",
        status: "PENDING_EMAIL", // must verify email before login
      },
    });

    await prisma.application.create({
      data: {
        userId: user.id,
        characterName,
        server,
        faction,
        class: wowClass,
        spec,
        itemLevel: itemLevel || null,
        raidExperience: raidExperience || null,
        playableTimes: playableTimes || null,
        kookId: kookId || null,
        wechatId: wechatId || null,
        applicationCode,
        status: "PENDING",
      },
    });

    // Issue + send email verification link
    const token = await createVerificationToken(email);
    const verifyUrl = `${appUrl()}/auth/verify-email?token=${token}`;

    let mailSent = false;
    let mailError: string | undefined;

    if (await isMailConfigured()) {
      const res = await sendMail({
        to: email,
        subject: "【Eternal Flame】请确认你的邮箱",
        html: verificationEmailHtml({
          nickname,
          verifyUrl,
          expiresHours: TOKEN_TTL_HOURS,
          appUrl: appUrl(),
        }),
      });
      mailSent = res.ok;
      mailError = res.error;
    } else {
      mailError = "邮件服务尚未配置，请联系公会官员";
    }

    if (!mailSent) {
      // Account is created regardless; surface a clear reason so the user can retry.
      console.warn("Verification email not sent:", mailError, verifyUrl);
      return NextResponse.json({
        success: true,
        mailSent: false,
        message: `注册成功，但验证邮件发送失败（${mailError || "未知原因"}）。请联系官员或在登录页重新发送验证邮件。`,
        applicationCode,
      });
    }

    return NextResponse.json({
      success: true,
      mailSent: true,
      message: "注册成功！我们已向你的邮箱发送确认邮件，请点击邮件中的链接完成验证。",
      applicationCode,
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "服务器错误，请稍后再试" }, { status: 500 });
  }
}