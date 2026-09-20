"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ExternalLink, Loader2, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

export type AdminComment = {
  id: string;
  content: string;
  status: string;
  createdAtLabel: string;
  authorName: string;
  authorEmail: string;
  postTitle: string;
  postSlug: string;
};

const TABS = [
  { key: "PENDING", label: "待审核" },
  { key: "APPROVED", label: "已通过" },
  { key: "REJECTED", label: "已拒绝" },
  { key: "ALL", label: "全部" },
] as const;

export default function CommentsClient({ initial }: { initial: AdminComment[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("PENDING");
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: initial.length };
    for (const t of TABS) {
      if (t.key === "ALL") continue;
      c[t.key] = initial.filter((x) => x.status === t.key).length;
    }
    return c;
  }, [initial]);

  const visible = useMemo(
    () => (tab === "ALL" ? initial : initial.filter((c) => c.status === tab)),
    [initial, tab]
  );

  async function moderate(id: string, status: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "操作失败");
        return;
      }
      toast.success(data.message || "已更新");
      router.refresh();
    } catch {
      toast.error("网络错误，请稍后再试");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("确定删除这条评论？此操作不可撤销。")) return;
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
    <div>
      {/* ---- 标签页 ---- */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-sm rounded border transition-colors ${
              tab === t.key
                ? "border-wow-gold text-wow-gold bg-wow-gold/10"
                : "border-border-default text-text-muted hover:border-border-gold hover:text-text-secondary"
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs opacity-70">{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-text-muted border border-border-default rounded bg-bg-card">
          {tab === "PENDING" ? "没有待审核的评论。" : "这里还没有内容。"}
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((c) => (
            <li key={c.id} className="bg-bg-card border border-border-default rounded p-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap text-xs">
                <span className="text-text-primary font-semibold text-sm">
                  {c.authorName}
                </span>
                <span className="text-text-muted">{c.authorEmail}</span>
                <span className="text-text-muted">· {c.createdAtLabel}</span>
                <span
                  className={`px-1.5 py-0.5 rounded border ${
                    c.status === "APPROVED"
                      ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                      : c.status === "REJECTED"
                      ? "text-wow-red border-wow-red/40 bg-wow-red/10"
                      : "text-amber-400 border-amber-500/40 bg-amber-500/10"
                  }`}
                >
                  {c.status === "APPROVED" ? "已通过" : c.status === "REJECTED" ? "已拒绝" : "待审核"}
                </span>
                <Link
                  href={`/news/${c.postSlug}`}
                  target="_blank"
                  className="ml-auto inline-flex items-center gap-1 text-text-muted hover:text-wow-gold transition-colors"
                >
                  {c.postTitle} <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <p className="text-sm text-text-secondary whitespace-pre-line break-words mb-3">
                {c.content}
              </p>

              <div className="flex items-center gap-2">
                {c.status !== "APPROVED" && (
                  <button
                    type="button"
                    onClick={() => moderate(c.id, "APPROVED")}
                    disabled={busy}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-wow-gold text-black rounded hover:bg-wow-gold-bright transition-colors disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    通过
                  </button>
                )}
                {c.status !== "REJECTED" && (
                  <button
                    type="button"
                    onClick={() => moderate(c.id, "REJECTED")}
                    disabled={busy}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-border-default text-text-secondary rounded hover:border-wow-red hover:text-wow-red transition-colors disabled:opacity-50"
                  >
                    <X className="w-3 h-3" /> 拒绝
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  disabled={busy}
                  className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-xs text-text-muted hover:text-wow-red transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" /> 删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
