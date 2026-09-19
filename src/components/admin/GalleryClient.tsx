"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Trash2, Plus, ImageIcon } from "lucide-react";

interface MediaItem {
  id: string;
  title: string | null;
  url: string;
  type: string;
  album: string | null;
  createdAt: string;
}

export default function GalleryClient({ initial }: { initial: MediaItem[] }) {
  const [list, setList] = useState<MediaItem[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", type: "IMAGE", album: "" });

  const submit = async () => {
    if (!form.url) return toast.error("URL 必填");
    setBusy(true);
    try {
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("已添加");
        setShowForm(false);
        setForm({ title: "", url: "", type: "IMAGE", album: "" });
        const fresh = await fetch("/api/gallery").then((r) => r.json());
        setList(fresh.media || []);
      } else {
        const d = await res.json();
        toast.error(d.error || "操作失败");
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("确定删除？")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/gallery?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setList(list.filter((x) => x.id !== id));
        toast.success("已删除");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-text-muted">共 {list.length} 个媒体</p>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-4 py-2 bg-wow-gold text-black font-bold text-sm rounded hover:bg-wow-gold-bright">
          <Plus className="w-4 h-4" /> 添加媒体
        </button>
      </div>

      {showForm && (
        <div className="bg-bg-card border border-border-gold rounded p-6 mb-6 space-y-3">
          <h3 className="font-bold text-text-primary">添加媒体</h3>
          <input type="text" placeholder="标题" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
          <input type="url" placeholder="图片 URL *" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none">
              <option value="IMAGE">图片</option>
              <option value="VIDEO">视频</option>
            </select>
            <input type="text" placeholder="相册（可选）" value={form.album} onChange={(e) => setForm({ ...form, album: e.target.value })}
              className="px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
          </div>
          <p className="text-xs text-text-muted">提示：建议使用图床链接（imgur / SM.MS / 自建 OSS）</p>
          <div className="flex gap-2">
            <button onClick={submit} disabled={busy} className="px-4 py-2 bg-wow-gold text-black font-bold text-sm rounded hover:bg-wow-gold-bright disabled:opacity-50">
              {busy && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}添加
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border-default text-text-muted rounded">取消</button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="text-center py-16 border border-border-default rounded bg-bg-card">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30 text-text-muted" />
          <p className="text-text-muted">暂无媒体，点击右上角添加</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {list.map((m) => (
            <div key={m.id} className="bg-bg-card border border-border-default rounded overflow-hidden group relative">
              {m.type === "IMAGE" ? (
                <div className="aspect-video bg-bg-secondary overflow-hidden">
                  <img src={m.url} alt={m.title || ""} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video bg-bg-secondary flex items-center justify-center text-text-muted">
                  🎥 视频
                </div>
              )}
              <div className="p-3">
                <div className="text-sm font-bold text-text-primary truncate">{m.title || "(无标题)"}</div>
                {m.album && <div className="text-xs text-text-muted">相册：{m.album}</div>}
              </div>
              <button onClick={() => remove(m.id)} className="absolute top-2 right-2 p-1.5 bg-bg-overlay/80 text-wow-red rounded opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}