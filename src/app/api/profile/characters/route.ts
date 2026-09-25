import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * 角色排序 / 删除（个人中心）。
 *
 * PATCH：把角色按传入的 id 顺序重排（sortOrder 0,1,2…）。
 *        只接受**属于当前用户**的 id，其余忽略 —— 防止越权重排他人角色。
 * DELETE：删除自己的某个角色。
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const ids: unknown = body.ids;
    if (!Array.isArray(ids) || ids.some((v) => typeof v !== "string")) {
      return NextResponse.json({ error: "ids 必须是字符串数组" }, { status: 400 });
    }

    // 只保留确实属于本人的角色，并按传入顺序编号
    const mine = await prisma.character.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const mineIds = new Set(mine.map((c) => c.id));
    const ordered = (ids as string[]).filter((id) => mineIds.has(id));

    await prisma.$transaction(
      ordered.map((id, index) =>
        prisma.character.update({ where: { id }, data: { sortOrder: index } })
      )
    );

    return NextResponse.json({ success: true, message: "排序已保存" });
  } catch (error) {
    console.error("[profile/characters] PATCH:", error);
    return NextResponse.json({ error: "排序失败，请稍后再试" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

    const target = await prisma.character.findUnique({
      where: { id },
      select: { userId: true, name: true },
    });
    if (!target || target.userId !== user.id) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    await prisma.character.delete({ where: { id } });
    return NextResponse.json({ success: true, message: `已删除角色 ${target.name}` });
  } catch (error) {
    console.error("[profile/characters] DELETE:", error);
    return NextResponse.json({ error: "删除失败，请稍后再试" }, { status: 500 });
  }
}
