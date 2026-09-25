import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isMemberOrAboveRole } from "@/lib/roles";
import { nicknameSchema } from "@/lib/validations";

/**
 * 个人资料 —— 目前只有**改昵称**。
 *
 * 用 GET 之外的动词而不是塞进 `/api/profile/characters`：后者管的是角色，
 * 昵称是账号层面的东西，混在一起以后只会越来越乱。
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id || !isMemberOrAboveRole(user.role)) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = nicknameSchema.safeParse(body?.name);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "昵称不合法" },
        { status: 400 }
      );
    }

    const name = parsed.data.replace(/[\u0000-\u001F\u007F]/g, "");

    await prisma.user.update({
      where: { id: user.id },
      data: { name },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "PROFILE_UPDATE_NICKNAME",
        detail: `昵称 ${user.name ?? "(未设置)"} → ${name}`,
      },
    });

    return NextResponse.json({
      success: true,
      name,
      // 提示前端：会话里的用户名是 token 里的旧值，需要刷新一下才生效
      message: `昵称已更新为「${name}」`,
    });
  } catch (error) {
    console.error("[profile] PATCH:", error);
    return NextResponse.json({ error: "保存失败，请稍后再试" }, { status: 500 });
  }
}
