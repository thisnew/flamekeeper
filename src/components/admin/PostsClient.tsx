"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Trash2, Edit, Send, Plus } from "lucide-react";
import Link from "next/link";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string;
  isPinned: boolean;
  isPublished: boolean;
  publishedAt: string | null;
  viewCount: number;
  createdAt: string;
}

const CATS = [
  { value: "NEWS", label: "新闻" },
  { value: "ANNOUNCEMENT", label: "公告" },
  { value: "BATTLE_REPORT", label: "战报" },
  { value: "EVENT", label: "活动" },
  { value: "RECRUITMENT", label: "招募" },
  { value: "MAINTENANCE", label: "维护" },
];

export default function PostsClient({ initial, authorId }: { initial: Post[]; authorId: string }) {
  const [list, setList] = useState<Post[]>(initial);
  const [editing, setEditing] = useState<Post | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    excerpt: "",
    category: "NEWS",
    tags: "",
    isPinned: false,
    isPublished: false,
  });

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", content: "", excerpt: "", category: "NEWS", tags: "", isPinned: false, isPublished: false });
    setShowForm(true);
  };

  const openEdit = (p: Post) => {
    setEditing(p);
    setForm({
      title: p.title,
      content: "",
      excerpt: p.excerpt || "",
      category: p.category,
      tags: "",
      isPinned: p.isPinned,
      isPublished: p.isPublished,
    });
    setShowForm(true);
  };

  const submit = async () => {
    if (!form.title || !form.content) return toast.error("标题与内容必填");
    setBusy(true);
    try {
      const url = editing ? `/api/posts` : `/api/posts`;
      const method = editing ? "PATCH" : "POST";
      const body = editing ? { ...form, id: editing.id } : { ...form, authorId };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(editing ? "已更新" : "已创建");
        setShowForm(false);
        // Refresh
        const fresh = await fetch("/api/posts?all=1").then((r) => r.json());
        setList(fresh.posts || []);
      } else {
        toast.error(data.error || "操作失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("确定删除？")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("已删除");
        setList(list.filter((p) => p.id !== id));
      }
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = async (p: Post) => {
    setBusy(true);
    try {
      const res = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, isPublished: !p.isPublished }),
      });
      if (res.ok) {
        setList(list.map((x) => x.id === p.id ? { ...x, isPublished: !p.isPublished } : x));
        toast.success(p.isPublished ? "已下线" : "已发布");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-text-muted">共 {list.length} 篇文章</p>
        <button onClick={openNew} className="flex items-center gap-1 px-4 py-2 bg-wow-gold text-black font-bold text-sm rounded hover:bg-wow-gold-bright">
          <Plus className="w-4 h-4" /> 新建文章
        </button>
      </div>

      {showForm && (
        <div className="bg-bg-card border border-border-gold rounded p-6 mb-6">
          <h3 className="font-bold text-text-primary mb-4">{editing ? "编辑文章" : "新建文章"}</h3>
          <div className="space-y-3">
            <input
              type="text" placeholder="标题"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none"
            />
            <select
              value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none"
            >
              {CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input
              type="text" placeholder="摘要（可选）"
              value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none"
            />
            <textarea
              rows={10} placeholder="正文（Markdown）"
              value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary font-mono text-sm focus:border-wow-gold focus:outline-none resize-y"
            />
            <input
              type="text" placeholder="标签（逗号分隔）"
              value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none"
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} />
                置顶
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
                立即发布
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={submit} disabled={busy} className="px-4 py-2 bg-wow-gold text-black font-bold text-sm rounded hover:bg-wow-gold-bright disabled:opacity-50 flex items-center gap-1">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                <Send className="w-4 h-4" /> 保存
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border-default text-text-muted rounded hover:text-text-primary">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-12 text-text-muted border border-border-default rounded bg-bg-card">暂无文章，点击右上角新建</div>
        ) : list.map((p) => (
          <div key={p.id} className="bg-bg-card border border-border-default rounded p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 bg-wow-gold/10 text-wow-gold border border-border-gold rounded">
                  {CATS.find((c) => c.value === p.category)?.label || p.category}
                </span>
                {p.isPinned && <span className="text-xs text-wow-red">📌置顶</span>}
                {p.isPublished ? (
                  <span className="text-xs text-wow-green">●已发布</span>
                ) : (
                  <span className="text-xs text-text-muted">○草稿</span>
                )}
              </div>
              <div className="font-bold text-text-primary truncate">{p.title}</div>
              <div className="text-xs text-text-muted mt-1">{new Date(p.createdAt).toLocaleString("zh-CN")} · {p.viewCount} 阅读</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => togglePublish(p)} className="text-xs px-2 py-1 border border-border-default text-text-muted hover:text-wow-gold rounded">
                {p.isPublished ? "下线" : "发布"}
              </button>
              <Link href={`/news/${p.slug}`} target="_blank" className="text-xs px-2 py-1 border border-border-default text-text-muted hover:text-wow-gold rounded">
                预览
              </Link>
              <button onClick={() => openEdit(p)} className="text-xs px-2 py-1 border border-border-default text-text-muted hover:text-wow-gold rounded">
                <Edit className="w-3 h-3" />
              </button>
              <button onClick={() => remove(p.id)} className="text-xs px-2 py-1 border border-wow-red/30 text-wow-red hover:bg-wow-red/10 rounded">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}