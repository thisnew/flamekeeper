import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * 角色排序 / 设主力 / 删除（个人中心）。
 *
 * PATCH 支持两种 body：
 *   { ids: [...] }      重排（只接受属于当前用户的 id，其余忽略）
 *   { mainId: "..." }   设为**唯一主力**：先把该用户所有角色置为非主力，
 *                       再置新的。传空字符串表示取消主力。
 *                       **只有公会成员角色**能设为主力。
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

    // ---- 设主力 ----
    if (body.mainId !== undefined) {
      const mainId = String(body.mainId || "");

      if (!mainId) {
        await prisma.character.updateMany({
          where: { userId: user.id },
          data: { isMain: false },
        });
        return NextResponse.json({ success: true, message: "已取消主力" });
      }

      const target = await prisma.character.findUnique({
        where: { id: mainId },
        select: { userId: true, name: true, guildMemberId: true },
      });
      if (!target || target.userId !== user.id) {
        return NextResponse.json({ error: "角色不存在" }, { status: 404 });
      }
      // 非公会成员不能当主力 —— 公会名单里没有他
      if (!target.guildMemberId) {
        return NextResponse.json(
          { error: "只有公会名单中的角色才能设为主力" },
          { status: 400 }
        );
      }

      await prisma.$transaction([
        prisma.character.updateMany({
          where: { userId: user.id },
          data: { isMain: false },
        }),
        prisma.character.update({
          where: { id: mainId },
          data: { isMain: true },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: `已将「${target.name}」设为主力`,
      });
    }

    // ---- 重排 ----
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
