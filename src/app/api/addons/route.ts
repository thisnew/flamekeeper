import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const where: any = {};
    if (category) where.category = category;

    const addons = await prisma.addon.findMany({
      where,
      orderBy: [{ isRecommended: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({ addons });
  } catch (error) {
    console.error("Addons GET:", error);
    return NextResponse.json({ error: "获取插件列表失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, category, applicableClass, gameVersion, downloadUrl, waString, tutorialContent, screenshotUrl, isRecommended } = body;

    if (!name || !description || !category) {
      return NextResponse.json({ error: "名称、描述、分类不能为空" }, { status: 400 });
    }

    let slug = generateSlug(name);
    const exists = await prisma.addon.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now().toString(36)}`;

    const addon = await prisma.addon.create({
      data: {
        name,
        slug,
        description,
        category,
        applicableClass: applicableClass || null,
        gameVersion: gameVersion || null,
        downloadUrl: downloadUrl || null,
        waString: waString || null,
        tutorialContent: tutorialContent || null,
        screenshotUrl: screenshotUrl || null,
        isRecommended: !!isRecommended,
      },
    });

    return NextResponse.json({ success: true, addon });
  } catch (error) {
    console.error("Addons POST:", error);
    return NextResponse.json({ error: "创建插件失败" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

    const addon = await prisma.addon.update({
      where: { id },
      data: {
        ...data,
        applicableClass: data.applicableClass || null,
        gameVersion: data.gameVersion || null,
        downloadUrl: data.downloadUrl || null,
        waString: data.waString || null,
        tutorialContent: data.tutorialContent || null,
        screenshotUrl: data.screenshotUrl || null,
      },
    });
    return NextResponse.json({ success: true, addon });
  } catch (error) {
    console.error("Addons PATCH:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    await prisma.addon.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Addons DELETE:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}