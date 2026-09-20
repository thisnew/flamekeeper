import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isMemberOrAboveRole, isOfficerOrAboveRole } from "@/lib/roles";
import { formatDate } from "@/lib/utils";
import { formatDateTime } from "@/lib/datetime";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import CommentSection, { type CommentView } from "@/components/comments/CommentSection";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  try {
    return await prisma.post.findUnique({
      where: { slug },
      include: { author: { select: { name: true, email: true } } },
    });
  } catch {
    return null;
  }
}

/**
 * 取该文章的评论。
 *
 * 可见性：已通过的评论对所有人可见；**当前登录用户自己**的待审/未通过评论
 * 也一并返回（否则作者会以为评论发丢了）。
 *
 * 官员在文章页**不**额外看到全部待审评论 —— 那是后台的工作流，
 * 在公开页面泄露未审内容不合适。
 */
async function getComments(postId: string, viewerId: string | null) {
  try {
    return await prisma.comment.findMany({
      where: {
        postId,
        OR: [{ status: "APPROVED" }, ...(viewerId ? [{ userId: viewerId }] : [])],
      },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "文章未找到" };
  return {
    title: post.title,
    description: post.excerpt || post.title,
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post || !post.isPublished) notFound();

  const session = await auth();
  const viewer = session?.user as any;
  const viewerId: string | null = viewer?.id ?? null;

  const comments = await getComments(post.id, viewerId);

  const commentViews: CommentView[] = comments.map((c) => ({
    id: c.id,
    userId: c.userId,
    content: c.content,
    status: c.status,
    // 服务端按 DISPLAY_TIMEZONE 格式化，客户端只负责显示
    createdAtLabel: formatDateTime(c.createdAt),
    authorName: c.user.name || c.user.email,
    isOwn: c.userId === viewerId,
  }));

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/news"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-wow-gold transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> 返回列表
      </Link>

      <article>
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2 py-0.5 bg-wow-gold/10 text-wow-gold border border-border-gold rounded">
              {post.category}
            </span>
            {post.isPinned && (
              <span className="text-xs px-2 py-0.5 bg-wow-red/10 text-wow-red border border-wow-red/30 rounded">
                置顶
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-wow-gold text-glow mb-4">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-text-muted">
            <span>{post.publishedAt ? formatDate(post.publishedAt) : ""}</span>
            {post.author.name && <span>· {post.author.name}</span>}
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> {post.viewCount}
            </span>
          </div>
        </header>

        {post.coverImage && (
          <div className="mb-8 rounded overflow-hidden border border-border-default">
            <img src={post.coverImage} alt={post.title} className="w-full object-cover max-h-96" />
          </div>
        )}

        <div className="prose prose-invert max-w-none text-text-secondary leading-relaxed">
          {post.content.split("\n").map((line, i) => {
            if (line.startsWith("## ")) {
              return <h2 key={i} className="font-display text-xl font-bold text-wow-gold mt-8 mb-4">{line.slice(3)}</h2>;
            }
            if (line.startsWith("### ")) {
              return <h3 key={i} className="font-bold text-lg text-text-primary mt-6 mb-3">{line.slice(4)}</h3>;
            }
            if (line.trim() === "") return <br key={i} />;
            return <p key={i} className="mb-3">{line}</p>;
          })}
        </div>

        {post.tags && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border-default">
            {post.tags.split(",").map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-bg-card border border-border-default rounded text-text-muted">
                {tag.trim()}
              </span>
            ))}
          </div>
        )}
      </article>

      <CommentSection
        postId={post.id}
        comments={commentViews}
        canComment={!!viewerId && isMemberOrAboveRole(viewer?.role)}
        isLoggedIn={!!viewerId}
        isOfficer={!!viewerId && isOfficerOrAboveRole(viewer?.role)}
      />
    </div>
  );
}
