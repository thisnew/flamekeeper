import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { generateSlug } from "@/lib/utils";

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

    const { email, password, nickname, characterName, server, faction, class: wowClass, spec, itemLevel, raidExperience, playableTimes, kookId, wechatId } = validated.data;

    // Check existing user
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
        status: "PENDING_APPROVAL", // Skip email verification in MVP
      },
    });

    // Create application
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

    return NextResponse.json({
      success: true,
      message: "注册成功！请等待官员审核你的入会申请。",
      applicationCode,
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "服务器错误，请稍后再试" }, { status: 500 });
  }
}