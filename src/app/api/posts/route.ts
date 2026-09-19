import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const skip = (page - 1) * limit;

    const where: any = { isPublished: true };
    if (category) where.category = category;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
        skip,
        take: limit,
        include: { author: { select: { id: true, name: true, email: true } } },
      }),
      prisma.post.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Posts GET:", error);
    return NextResponse.json({ error: "获取文章列表失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, content, excerpt, coverImage, category, tags, isPinned, isPublished, authorId } = body;

    if (!title || !content || !category || !authorId) {
      return NextResponse.json({ error: "标题、内容、分类、作者不能为空" }, { status: 400 });
    }

    let slug = generateSlug(title);
    const exists = await prisma.post.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now().toString(36)}`;

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content,
        excerpt: excerpt || null,
        coverImage: coverImage || null,
        category,
        tags: tags || null,
        isPinned: !!isPinned,
        isPublished: !!isPublished,
        publishedAt: isPublished ? new Date() : null,
        authorId,
      },
    });

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error("Posts POST:", error);
    return NextResponse.json({ error: "创建文章失败" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

    const updateData: any = { ...data };
    if (data.isPublished !== undefined) {
      updateData.publishedAt = data.isPublished ? (data.publishedAt ? new Date(data.publishedAt) : new Date()) : null;
    }

    const post = await prisma.post.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error("Posts PATCH:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Posts DELETE:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}