import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Paperclip, Download, Calendar, User as UserIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

function formatSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function getShare(slug: string) {
  try {
    return await prisma.post.findUnique({
      where: { slug },
      include: { author: { select: { name: true, email: true } } },
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const share = await getShare(slug);
  if (!share) return { title: "分享未找到" };
  return { title: share.title, description: share.excerpt || share.title };
}

export default async function ShareDetailPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { slug } = await params;
  const share = await getShare(slug);

  if (!share || share.category !== "SHARING" || !share.isPublished) notFound();

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-wow-gold mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> 返回工具分享
      </Link>

      <article>
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2 py-0.5 bg-wow-gold/10 text-wow-gold border border-border-gold rounded">
              其他分享
            </span>
            {share.isPinned && (
              <span className="text-xs px-2 py-0.5 bg-wow-red/10 text-wow-red border border-wow-red/30 rounded">
                置顶
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-wow-gold text-glow mb-4">
            {share.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {share.publishedAt ? formatDate(share.publishedAt) : formatDate(share.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <UserIcon className="w-3.5 h-3.5" />
              {share.author.name || share.author.email}
            </span>
          </div>
        </header>

        {share.attachmentUrl && (
          <div className="mb-8 flex items-center justify-between gap-4 bg-bg-card border border-border-gold rounded p-4">
            <span className="flex items-center gap-2 text-sm text-text-primary min-w-0">
              <Paperclip className="w-4 h-4 text-wow-gold shrink-0" />
              <span className="truncate">{share.attachmentName || "附件"}</span>
              {share.attachmentSize ? (
                <span className="text-xs text-text-muted shrink-0">
                  ({formatSize(share.attachmentSize)})
                </span>
              ) : null}
            </span>
            <a
              href={share.attachmentUrl}
              download
              className="flex items-center gap-1.5 px-4 py-2 bg-wow-blue/20 text-wow-blue-light border border-wow-blue/40 rounded hover:bg-wow-blue/30 transition-colors shrink-0"
            >
              <Download className="w-4 h-4" /> 下载
            </a>
          </div>
        )}

        <div className="prose prose-invert max-w-none text-text-secondary leading-relaxed">
          {share.content.split("\n").map((line, i) => {
            if (line.startsWith("## ")) {
              return <h2 key={i} className="font-display text-xl font-bold text-wow-gold mt-8 mb-4">{line.slice(3)}</h2>;
            }
            if (line.startsWith("### ")) {
              return <h3 key={i} className="font-bold text-lg text-text-primary mt-6 mb-3">{line.slice(4)}</h3>;
            }
            if (line.startsWith("- ")) {
              return <li key={i} className="ml-5 list-disc mb-1">{line.slice(2)}</li>;
            }
            if (line.trim() === "") return <br key={i} />;
            return <p key={i} className="mb-3">{line}</p>;
          })}
        </div>

        {share.tags && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border-default">
            {share.tags.split(",").map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-bg-card border border-border-default rounded text-text-muted">
                {tag.trim()}
              </span>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
