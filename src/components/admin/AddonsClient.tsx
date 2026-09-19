"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Trash2, Edit, Plus } from "lucide-react";

interface Addon {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  gameVersion: string | null;
  downloadUrl: string | null;
  waString: string | null;
  tutorialContent: string | null;
  isRecommended: boolean;
}

const CATS = [
  { value: "RAID", label: "团本" },
  { value: "MPLUS", label: "大秘境" },
  { value: "PVP", label: "PVP" },
  { value: "UI", label: "界面" },
  { value: "CLASS", label: "职业" },
  { value: "WEAKAURA", label: "WA" },
  { value: "MACRO", label: "宏" },
  { value: "TOOL", label: "工具" },
];

export default function AddonsClient({ initial }: { initial: Addon[] }) {
  const [list, setList] = useState<Addon[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Addon | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", category: "TOOL",
    gameVersion: "", downloadUrl: "", waString: "", tutorialContent: "",
    applicableClass: "", isRecommended: false,
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", category: "TOOL", gameVersion: "", downloadUrl: "", waString: "", tutorialContent: "", applicableClass: "", isRecommended: false });
    setShowForm(true);
  };

  const openEdit = (a: Addon) => {
    setEditing(a);
    setForm({
      name: a.name,
      description: a.description,
      category: a.category,
      gameVersion: a.gameVersion || "",
      downloadUrl: a.downloadUrl || "",
      waString: a.waString || "",
      tutorialContent: a.tutorialContent || "",
      applicableClass: "",
      isRecommended: a.isRecommended,
    });
    setShowForm(true);
  };

  const submit = async () => {
    if (!form.name || !form.description) return toast.error("名称与描述必填");
    setBusy(true);
    try {
      const res = await fetch("/api/addons", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { ...form, id: editing.id } : form),
      });
      if (res.ok) {
        toast.success(editing ? "已更新" : "已创建");
        setShowForm(false);
        const fresh = await fetch("/api/addons").then((r) => r.json());
        setList(fresh.addons || []);
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
      const res = await fetch(`/api/addons?id=${id}`, { method: "DELETE" });
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
        <p className="text-sm text-text-muted">共 {list.length} 个插件</p>
        <button onClick={openNew} className="flex items-center gap-1 px-4 py-2 bg-wow-gold text-black font-bold text-sm rounded hover:bg-wow-gold-bright">
          <Plus className="w-4 h-4" /> 新建插件
        </button>
      </div>

      {showForm && (
        <div className="bg-bg-card border border-border-gold rounded p-6 mb-6 space-y-3">
          <h3 className="font-bold text-text-primary">{editing ? "编辑插件" : "新建插件"}</h3>
          <input type="text" placeholder="插件名称 *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
          <textarea rows={2} placeholder="描述 *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none resize-none" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none">
            {CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input type="text" placeholder="适用职业（可选，逗号分隔）" value={form.applicableClass} onChange={(e) => setForm({ ...form, applicableClass: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
          <input type="text" placeholder="适用版本（如 11.0.5）" value={form.gameVersion} onChange={(e) => setForm({ ...form, gameVersion: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
          <input type="url" placeholder="下载链接" value={form.downloadUrl} onChange={(e) => setForm({ ...form, downloadUrl: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
          <textarea rows={3} placeholder="WeakAuras 字符串" value={form.waString} onChange={(e) => setForm({ ...form, waString: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary font-mono text-xs focus:border-wow-gold focus:outline-none resize-y" />
          <textarea rows={4} placeholder="配置教程（Markdown）" value={form.tutorialContent} onChange={(e) => setForm({ ...form, tutorialContent: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none resize-y" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isRecommended} onChange={(e) => setForm({ ...form, isRecommended: e.target.checked })} />
            标记为推荐
          </label>
          <div className="flex gap-2">
            <button onClick={submit} disabled={busy} className="px-4 py-2 bg-wow-gold text-black font-bold text-sm rounded hover:bg-wow-gold-bright disabled:opacity-50">
              {busy && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}保存
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border-default text-text-muted rounded">取消</button>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {list.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-text-muted border border-border-default rounded bg-bg-card">暂无插件</div>
        ) : list.map((a) => (
          <div key={a.id} className="bg-bg-card border border-border-default rounded p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 bg-wow-gold/10 text-wow-gold border border-border-gold rounded">
                  {CATS.find((c) => c.value === a.category)?.label || a.category}
                </span>
                {a.isRecommended && <span className="text-xs text-wow-orange">推荐</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(a)} className="p-1 text-text-muted hover:text-wow-gold"><Edit className="w-3 h-3" /></button>
                <button onClick={() => remove(a.id)} className="p-1 text-text-muted hover:text-wow-red"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
            <div className="font-bold text-text-primary">{a.name}</div>
            <div className="text-xs text-text-muted mt-1 line-clamp-2">{a.description}</div>
            {a.gameVersion && <div className="text-xs text-text-muted mt-1">版本：{a.gameVersion}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}