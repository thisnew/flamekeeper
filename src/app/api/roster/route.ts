import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const character = await prisma.character.create({
      data: {
        name,
        server,
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
  } catch (error) {
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