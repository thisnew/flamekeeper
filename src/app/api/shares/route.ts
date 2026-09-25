import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isMemberOrAboveRole, isOfficerOrAboveRole } from "@/lib/roles";
import { generateSlug } from "@/lib/utils";

import { maskEmail } from "@/lib/privacy";
const SHARE_CATEGORY = "SHARING";

// GET /api/shares — list published shares (newest first)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get("mine") === "1";

    const session = await auth();
    const user = session?.user as any;
    if (mine && !user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const shares = await prisma.post.findMany({
      where: {
        category: SHARE_CATEGORY,
        ...(mine ? { authorId: user.id } : { isPublished: true }),
      },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      include: { author: { select: { id: true, name: true, email: true, image: true } } },
    });

    // 作者邮箱在**响应里就遮蔽** —— 它只是「没有昵称时的兜底显示」
    return NextResponse.json({
      shares: shares.map((s) => ({
        ...s,
        author: s.author ? { ...s.author, email: maskEmail(s.author.email) } : s.author,
      })),
    });
  } catch (error) {
    console.error("Shares GET:", error);
    return NextResponse.json({ error: "获取分享列表失败" }, { status: 500 });
  }
}

// POST /api/shares — member publish a share
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    if (!isMemberOrAboveRole(user.role)) {
      return NextResponse.json(
        { error: "仅审批通过的公会成员可以发布分享" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title, content, excerpt, tags,
      attachmentUrl, attachmentName, attachmentSize,
    } = body as Record<string, any>;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: "请填写标题" }, { status: 400 });
    }
    if (!content || !String(content).trim()) {
      return NextResponse.json({ error: "请填写内容" }, { status: 400 });
    }

    let slug = generateSlug(String(title));
    if (!slug) slug = `share-${Date.now().toString(36)}`;
    const exists = await prisma.post.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now().toString(36)}`;

    const share = await prisma.post.create({
      data: {
        title: String(title).trim(),
        slug,
        content: String(content),
        excerpt: excerpt ? String(excerpt) : null,
        category: SHARE_CATEGORY,
        tags: tags ? String(tags) : null,
        isPinned: false,
        isPublished: true,
        publishedAt: new Date(),
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
        attachmentSize: typeof attachmentSize === "number" ? attachmentSize : null,
        authorId: user.id,
      },
    });

    return NextResponse.json({ success: true, share });
  } catch (error) {
    console.error("Shares POST:", error);
    return NextResponse.json({ error: "发布失败，请稍后再试" }, { status: 500 });
  }
}

// DELETE /api/shares?id=xxx — author or officer/admin
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    const share = await prisma.post.findUnique({ where: { id } });
    if (!share || share.category !== SHARE_CATEGORY) {
      return NextResponse.json({ error: "分享不存在" }, { status: 404 });
    }

    if (share.authorId !== user.id && !isOfficerOrAboveRole(user.role)) {
      return NextResponse.json({ error: "无权删除该分享" }, { status: 403 });
    }

    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Shares DELETE:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}