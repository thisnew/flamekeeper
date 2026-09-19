import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return NextResponse.json({ settings: map });
  } catch (error) {
    console.error("Settings GET:", error);
    return NextResponse.json({ error: "获取设置失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entries = Object.entries(body) as Array<[string, string]>;
    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value: String(value ?? "") },
          create: { key, value: String(value ?? "") },
        })
      )
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings POST:", error);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}