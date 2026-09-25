import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canonicalRealmName } from "@/lib/realms";

export async function GET() {
  try {
    const characters = await prisma.character.findMany({
      where: { isPublic: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ characters });
  } catch (error) {
    console.error("Roster GET:", error);
    return NextResponse.json({ error: "获取成员列表失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, server, faction, class: wowClass, spec, role, level, itemLevel, mythicScore, raidProgress, status, isPublic, userId } = body;

    if (!name || !server || !faction || !wowClass || !spec || !role) {
      return NextResponse.json({ error: "必填字段缺失" }, { status: 400 });
    }

    // 服务器名归一到字典的中文规范名 —— Character 有 @@unique([server, name])，
    // 不归一的话「回音山」和 "Echo Ridge" 会被当成两个不同角色。
    const canonicalServer = await canonicalRealmName(server);

    // 先查再插，给一个能看懂的报错（直接撞唯一索引会抛 Prisma P2002，前端只能看到 500）
    const clash = await prisma.character.findFirst({
      where: { server: canonicalServer, name },
      select: { id: true, name: true, server: true, user: { select: { name: true, email: true } } },
    });
    if (clash) {
      const owner = clash.user?.name || clash.user?.email || "（未绑定成员）";
      return NextResponse.json(
        { error: `已存在同名角色「${name}@${canonicalServer}」，归属：${owner}` },
        { status: 409 }
      );
    }

    const character = await prisma.character.create({
      data: {
        name,
        server: canonicalServer,
        faction,
        class: wowClass,
        spec,
        role,
        level: level || 80,
        itemLevel: itemLevel || null,
        mythicScore: mythicScore || null,
        raidProgress: raidProgress || null,
        status: status || "ACTIVE",
        isPublic: isPublic !== false,
        userId: userId || null,
      },
    });
    return NextResponse.json({ success: true, character });
  } catch (error: any) {
    // 并发下两个人同时建同名角色时，先查后插之间有竞态 —— 兜住唯一索引
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "该服务器下已存在同名角色，无法重复创建" },
        { status: 409 }
      );
    }
    console.error("Roster POST:", error);
    return NextResponse.json({ error: "创建角色失败" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

    const character = await prisma.character.update({
      where: { id },
      data: {
        ...data,
        itemLevel: data.itemLevel || null,
        mythicScore: data.mythicScore || null,
        raidProgress: data.raidProgress || null,
      },
    });
    return NextResponse.json({ success: true, character });
  } catch (error) {
    console.error("Roster PATCH:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    await prisma.character.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Roster DELETE:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}