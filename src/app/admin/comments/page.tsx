import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/datetime";
import { isCommentModerationOn } from "@/lib/comments";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CommentsClient, { type AdminComment } from "@/components/admin/CommentsClient";

export const metadata: Metadata = { title: "评论审核 - 管理后台" };

/** 一次最多取多少条 —— 公会规模下足够，避免一次拉爆。 */
const LIMIT = 200;

export default async function AdminCommentsPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!user || (user.role !== "OFFICER" && user.role !== "ADMIN")) redirect("/auth/login");

  const [rows, moderationOn] = await Promise.all([
    prisma.comment
      .findMany({
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        include: {
          user: { select: { name: true, email: true } },
          post: { select: { title: true, slug: true } },
        },
      })
      .catch(() => []),
    isCommentModerationOn(),
  ]);

  const comments: AdminComment[] = rows.map((c) => ({
    id: c.id,
    content: c.content,
    status: c.status,
    createdAtLabel: formatDateTime(c.createdAt),
    authorName: c.user.name || c.user.email,
    authorEmail: c.user.email,
    postTitle: c.post.title,
    postSlug: c.post.slug,
  }));

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-wow-gold mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> 返回后台
      </Link>
      <h1 className="font-display text-2xl font-bold text-wow-gold text-glow mb-2">评论审核</h1>

      <p className="text-sm text-text-muted mb-8">
        当前<strong className={moderationOn ? "text-amber-400" : "text-emerald-400"}>
          {moderationOn ? "已开启" : "已关闭"}
        </strong>
        评论先审后发。
        <span className="text-text-muted">
          {" "}
          （开关在{" "}
          <Link href="/admin/settings" className="text-wow-gold hover:underline">
            系统设置
          </Link>{" "}
          的 <code className="text-xs">comment_moderation</code>）
        </span>
        {moderationOn && " 官员与管理员自己发的评论始终直接通过。"}
      </p>

      <CommentsClient initial={comments} />
    </div>
  );
}
