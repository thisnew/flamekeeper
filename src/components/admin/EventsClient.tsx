"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Trash2, Plus } from "lucide-react";

interface EventItem {
  id: string;
  title: string;
  eventType: string;
  startTime: string;
  endTime: string;
  maxSlots: number | null;
  location: string | null;
  description: string | null;
  signups: { id: string }[];
}

const TYPES = [{ value: "RAID", label: "团本" }, { value: "MPLUS", label: "大秘境" }, { value: "PVP", label: "PVP" }, { value: "SOCIAL", label: "聚会" }, { value: "OTHER", label: "其他" }];

function toLocal(d: string) {
  return new Date(d).toISOString().slice(0, 16);
}

export default function EventsClient({ initial }: { initial: EventItem[] }) {
  const [list, setList] = useState<EventItem[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "", eventType: "RAID", startTime: "", endTime: "", maxSlots: "", location: "", description: "",
  });

  const submit = async () => {
    if (!form.title || !form.startTime || !form.endTime) return toast.error("标题与起止时间必填");
    setBusy(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          maxSlots: form.maxSlots ? Number(form.maxSlots) : null,
        }),
      });
      if (res.ok) {
        toast.success("已创建");
        setShowForm(false);
        setForm({ title: "", eventType: "RAID", startTime: "", endTime: "", maxSlots: "", location: "", description: "" });
        const fresh = await fetch("/api/events").then((r) => r.json());
        setList(fresh.events || []);
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
      const res = await fetch(`/api/events?id=${id}`, { method: "DELETE" });
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
        <p className="text-sm text-text-muted">共 {list.length} 个活动</p>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-4 py-2 bg-wow-gold text-black font-bold text-sm rounded hover:bg-wow-gold-bright">
          <Plus className="w-4 h-4" /> 新建活动
        </button>
      </div>

      {showForm && (
        <div className="bg-bg-card border border-border-gold rounded p-6 mb-6 space-y-3">
          <h3 className="font-bold text-text-primary">新建活动</h3>
          <input type="text" placeholder="活动标题 *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              className="px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none">
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className="px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
            <input type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              className="px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
            <input type="number" placeholder="名额上限" value={form.maxSlots} onChange={(e) => setForm({ ...form, maxSlots: e.target.value })}
              className="px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
          </div>
          <input type="text" placeholder="地点（语音频道/副本区）" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
          <textarea rows={3} placeholder="活动描述" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none resize-y" />
          <div className="flex gap-2">
            <button onClick={submit} disabled={busy} className="px-4 py-2 bg-wow-gold text-black font-bold text-sm rounded hover:bg-wow-gold-bright disabled:opacity-50">
              {busy && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}创建
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border-default text-text-muted rounded">取消</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {list.length === 0 ? (
          <div className="text-center py-12 text-text-muted border border-border-default rounded bg-bg-card">暂无活动</div>
        ) : list.map((e) => (
          <div key={e.id} className="bg-bg-card border border-border-default rounded p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 bg-wow-gold/10 text-wow-gold border border-border-gold rounded">
                  {TYPES.find((t) => t.value === e.eventType)?.label || e.eventType}
                </span>
                {e.maxSlots && <span className="text-xs text-text-muted">报名 {e.signups.length}/{e.maxSlots}</span>}
              </div>
              <div className="font-bold text-text-primary">{e.title}</div>
              <div className="text-xs text-text-muted mt-1">
                {new Date(e.startTime).toLocaleString("zh-CN")} - {new Date(e.endTime).toLocaleString("zh-CN")}
                {e.location && ` · ${e.location}`}
              </div>
            </div>
            <button onClick={() => remove(e.id)} className="p-2 text-wow-red hover:bg-wow-red/10 rounded shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}