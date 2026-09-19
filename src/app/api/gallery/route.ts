import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const media = await prisma.media.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ media });
  } catch (error) {
    console.error("Gallery GET:", error);
    return NextResponse.json({ error: "获取媒体失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, url, type, album } = body;
    if (!url || !type) return NextResponse.json({ error: "URL 与类型必填" }, { status: 400 });

    const media = await prisma.media.create({
      data: {
        title: title || null,
        url,
        type,
        album: album || null,
      },
    });
    return NextResponse.json({ success: true, media });
  } catch (error) {
    console.error("Gallery POST:", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    await prisma.media.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gallery DELETE:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}