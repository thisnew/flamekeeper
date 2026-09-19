import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) return NextResponse.json({ error: "请填写完整" }, { status: 400 });
    if (newPassword.length < 6) return NextResponse.json({ error: "新密码至少6位" }, { status: 400 });

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

    const { compare } = await import("bcryptjs");
    const ok = await compare(currentPassword, dbUser.passwordHash);
    if (!ok) return NextResponse.json({ error: "当前密码错误" }, { status: 400 });

    const newHash = await hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
    await prisma.auditLog.create({
      data: { userId: user.id, action: "PASSWORD_CHANGE", detail: "User changed password" },
    });

    return NextResponse.json({ success: true, message: "密码已更新" });
  } catch (error) {
    console.error("Change password:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}