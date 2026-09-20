"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, MessageSquare, Send, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export type CommentView = {
  id: string;
  userId: string;
  content: string;
  status: string;
  /** 服务端预格式化的时间文本 —— 见 lib/datetime.ts，客户端格式化会 hydration mismatch */
  createdAtLabel: string;
  authorName: string;
  isOwn: boolean;
};

const STATUS_BADGES: Record<string, { text: string; cls: string }> = {
  PENDING: { text: "待审核", cls: "text-amber-400 border-amber-500/40 bg-amber-500/10" },
  REJECTED: { text: "未通过", cls: "text-wow-red border-wow-red/40 bg-wow-red/10" },
};

export default function CommentSection({
  postId,
  comments,
  canComment,
  isLoggedIn,
  isOfficer,
}: {
  postId: string;
  comments: CommentView[];
  canComment: boolean;
  isLoggedIn: boolean;
  isOfficer: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("请先写点什么");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "发表失败");
        return;
      }
      setContent("");
      toast.success(data.message || "已提交");
      router.refresh();
    } catch {
      toast.error("网络错误，请稍后再试");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("确定删除这条评论？")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/comments?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "删除失败");
        return;
      }
      toast.success("已删除");
      router.refresh();
    } catch {
      toast.error("网络错误，请稍后再试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12 pt-8 border-t border-border-default">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-wow-gold mb-6">
        <MessageSquare className="w-5 h-5" />
        评论
        <span className="text-sm font-normal text-text-muted">（{comments.length}）</span>
      </h2>

      {/* ---- 发表框 ---- */}
      {canComment ? (
        <form onSubmit={submit} className="mb-8">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="说点什么…"
            className="w-full px-3 py-2.5 text-sm bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none resize-y"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-text-muted">{content.length}/1000</span>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-wow-gold text-black rounded hover:bg-wow-gold-bright transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              发表
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 text-sm text-text-muted border border-border-default rounded bg-bg-card">
          {isLoggedIn ? (
            <>仅公会成员可以发表评论。你的入会申请通过后即可参与讨论。</>
          ) : (
            <>
              <Link href="/auth/login" className="text-wow-gold hover:underline">
                登录
              </Link>{" "}
              后可发表评论（需为已通过审批的公会成员）。
            </>
          )}
        </div>
      )}

      {/* ---- 列表 ---- */}
      {comments.length === 0 ? (
        <p className="text-sm text-text-muted py-8 text-center border border-border-default rounded bg-bg-card">
          还没有评论，来做第一个吧。
        </p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => {
            const badge = STATUS_BADGES[c.status];
            return (
              <li
                key={c.id}
                className="bg-bg-card border border-border-default rounded p-4"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-sm font-semibold text-text-primary">
                    {c.authorName}
                  </span>
                  {c.isOwn && <span className="text-xs text-wow-gold">（我）</span>}
                  {badge && (
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${badge.cls}`}>
                      {badge.text}
                    </span>
                  )}
                  <span className="text-xs text-text-muted">{c.createdAtLabel}</span>
                  {(c.isOwn || isOfficer) && (
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      disabled={busy}
                      className="ml-auto text-text-muted hover:text-wow-red transition-colors disabled:opacity-50"
                      title="删除评论"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-text-secondary whitespace-pre-line break-words">
                  {c.content}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {isOfficer && (
        <p className="mt-4 text-xs text-text-muted">
          待审核的评论可在{" "}
          <Link href="/admin/comments" className="text-wow-gold hover:underline">
            后台 → 评论审核
          </Link>{" "}
          处理。
        </p>
      )}
    </section>
  );
}
