import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: { startTime: "asc" },
      include: { signups: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
    return NextResponse.json({ events });
  } catch (error) {
    console.error("Events GET:", error);
    return NextResponse.json({ error: "获取活动失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, eventType, startTime, endTime, maxSlots, location } = body;

    if (!title || !eventType || !startTime || !endTime) {
      return NextResponse.json({ error: "标题、类型、起止时间不能为空" }, { status: 400 });
    }

    let slug = generateSlug(title);
    const exists = await prisma.event.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now().toString(36)}`;

    const event = await prisma.event.create({
      data: {
        title,
        slug,
        description: description || null,
        eventType,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        maxSlots: maxSlots || null,
        location: location || null,
      },
    });
    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("Events POST:", error);
    return NextResponse.json({ error: "创建活动失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Events DELETE:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}