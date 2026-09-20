import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isMemberOrAboveRole, isOfficerOrAboveRole } from "@/lib/roles";
import {
  commentStatusLabel,
  initialCommentStatus,
  isCommentStatus,
  normalizeCommentContent,
} from "@/lib/comments";

/**
 * 发表评论。仅公会成员（MEMBER 及以上）—— 待审批用户与游客同权，不能评论。
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id || !isMemberOrAboveRole(user.role)) {
      return NextResponse.json({ error: "仅公会成员可发表评论" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const postId = typeof body.postId === "string" ? body.postId : "";
    if (!postId) {
      return NextResponse.json({ error: "缺少文章 id" }, { status: 400 });
    }

    const parsed = normalizeCommentContent(body.content);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isPublished: true, title: true },
    });
    if (!post || !post.isPublished) {
      return NextResponse.json({ error: "文章不存在或未发布" }, { status: 404 });
    }

    const status = await initialCommentStatus(user.role);

    const comment = await prisma.comment.create({
      data: { postId, userId: user.id, content: parsed.content, status },
      select: { id: true, status: true, createdAt: true },
    });

    return NextResponse.json({
      success: true,
      comment,
      message:
        status === "PENDING"
          ? "评论已提交，待官员审核后公开显示"
          : "评论已发布",
    });
  } catch (error) {
    console.error("[comments] POST:", error);
    return NextResponse.json({ error: "发表评论失败，请稍后再试" }, { status: 500 });
  }
}

/**
 * 审核评论（官员及以上）。
 * 通过 / 拒绝 / 退回待审。
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const actor = session?.user as any;
    if (!actor?.id || !isOfficerOrAboveRole(actor.role)) {
      return NextResponse.json({ error: "仅官员可审核评论" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "缺少评论 id" }, { status: 400 });

    if (!isCommentStatus(body.status)) {
      return NextResponse.json({ error: "审核状态非法" }, { status: 400 });
    }

    const existing = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "评论不存在" }, { status: 404 });
    }

    await prisma.comment.update({ where: { id }, data: { status: body.status } });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: "COMMENT_MODERATE",
        detail: `评论 ${id}：${commentStatusLabel(existing.status)} → ${commentStatusLabel(
          String(body.status)
        )}`,
      },
    });

    return NextResponse.json({ success: true, message: "已更新审核状态" });
  } catch (error) {
    console.error("[comments] PATCH:", error);
    return NextResponse.json({ error: "审核失败，请稍后再试" }, { status: 500 });
  }
}

/**
 * 删除评论：作者本人可删自己的，官员及以上可删任意一条。
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const actor = session?.user as any;
    if (!actor?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少评论 id" }, { status: 400 });

    const existing = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, userId: true, postId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "评论不存在" }, { status: 404 });
    }

    const isOwner = existing.userId === actor.id;
    if (!isOwner && !isOfficerOrAboveRole(actor.role)) {
      return NextResponse.json({ error: "只能删除自己的评论" }, { status: 403 });
    }

    await prisma.comment.delete({ where: { id } });

    // 只有官员删别人的才留痕 —— 自己删自己的不值得记一条审计
    if (!isOwner) {
      await prisma.auditLog.create({
        data: {
          userId: actor.id,
          action: "COMMENT_DELETE",
          detail: `删除他人评论 ${id}（文章 ${existing.postId}）`,
        },
      });
    }

    return NextResponse.json({ success: true, message: "评论已删除" });
  } catch (error) {
    console.error("[comments] DELETE:", error);
    return NextResponse.json({ error: "删除失败，请稍后再试" }, { status: 500 });
  }
}
