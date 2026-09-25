"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Trash2, Plus } from "lucide-react";

interface Character {
  id: string;
  name: string;
  server: string;
  faction: string;
  class: string;
  spec: string;
  role: string;
  level: number;
  itemLevel: number | null;
  mythicScore: number | null;
  status: string;
  isPublic: boolean;
}

const CLASSES = ["Warrior", "Paladin", "Hunter", "Rogue", "Priest", "Death Knight", "Shaman", "Mage", "Warlock", "Monk", "Druid", "Demon Hunter", "Evoker"];
const ROLES = [{ value: "Tank", label: "坦克" }, { value: "Healer", label: "治疗" }, { value: "DPS", label: "DPS" }];
const STATUSES = [{ value: "ACTIVE", label: "主力" }, { value: "BENCH", label: "替补" }, { value: "CASUAL", label: "休闲" }, { value: "LEFT", label: "离会" }];

export default function RosterClient({ initial }: { initial: Character[] }) {
  const [list, setList] = useState<Character[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "", server: "", faction: "Alliance", class: "Warrior", spec: "", role: "DPS",
    level: 80, itemLevel: "", mythicScore: "", status: "ACTIVE", isPublic: true,
  });

  const submit = async () => {
    if (!form.name || !form.server || !form.spec) return toast.error("角色名、服务器、专精必填");
    setBusy(true);
    try {
      const res = await fetch("/api/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          itemLevel: form.itemLevel ? Number(form.itemLevel) : null,
          mythicScore: form.mythicScore ? Number(form.mythicScore) : null,
        }),
      });
      if (res.ok) {
        toast.success("已添加");
        setShowForm(false);
        setForm({ name: "", server: "", faction: "Alliance", class: "Warrior", spec: "", role: "DPS", level: 80, itemLevel: "", mythicScore: "", status: "ACTIVE", isPublic: true });
        const fresh = await fetch("/api/roster?all=1").then((r) => r.json());
        setList(fresh.characters || []);
      } else {
        const d = await res.json();
        toast.error(d.error || "操作失败");
      }
    } finally {
      setBusy(false);
    }
  };

  const update = async (id: string, data: Partial<Character>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/roster", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      });
      if (res.ok) {
        const fresh = await fetch("/api/roster?all=1").then((r) => r.json());
        setList(fresh.characters || []);
        toast.success("已更新");
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("确定删除？")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/roster?id=${id}`, { method: "DELETE" });
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
        <p className="text-sm text-text-muted">共 {list.length} 个角色</p>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-4 py-2 bg-wow-gold text-black font-bold text-sm rounded hover:bg-wow-gold-bright">
          <Plus className="w-4 h-4" /> 添加角色
        </button>
      </div>

      {showForm && (
        <div className="bg-bg-card border border-border-gold rounded p-6 mb-6 space-y-3">
          <h3 className="font-bold text-text-primary">添加公会角色</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <input type="text" placeholder="角色名 *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
            <input type="text" placeholder="服务器 *" value={form.server} onChange={(e) => setForm({ ...form, server: e.target.value })}
              className="px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
            <select value={form.faction} onChange={(e) => setForm({ ...form, faction: e.target.value })}
              className="px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none">
              <option value="Alliance">联盟</option>
              <option value="Horde">部落</option>
            </select>
            <select value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })}
              className="px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none">
              {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="text" placeholder="专精 *" value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })}
              className="px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <input type="number" placeholder="装等" value={form.itemLevel} onChange={(e) => setForm({ ...form, itemLevel: e.target.value })}
              className="px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
            <input type="number" placeholder="大秘境分数" value={form.mythicScore} onChange={(e) => setForm({ ...form, mythicScore: e.target.value })}
              className="px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none">
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} />
            对外公开
          </label>
          <div className="flex gap-2">
            <button onClick={submit} disabled={busy} className="px-4 py-2 bg-wow-gold text-black font-bold text-sm rounded hover:bg-wow-gold-bright disabled:opacity-50">
              {busy && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}添加
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border-default text-text-muted rounded">取消</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-gold">
              <th className="text-left py-2 px-3 text-wow-gold text-xs">角色</th>
              <th className="text-left py-2 px-3 text-wow-gold text-xs">职业/专精</th>
              <th className="text-left py-2 px-3 text-wow-gold text-xs">职能</th>
              <th className="text-left py-2 px-3 text-wow-gold text-xs">装等</th>
              <th className="text-left py-2 px-3 text-wow-gold text-xs">分数</th>
              <th className="text-left py-2 px-3 text-wow-gold text-xs">状态</th>
              <th className="text-left py-2 px-3 text-wow-gold text-xs">公开</th>
              <th className="text-left py-2 px-3 text-wow-gold text-xs">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-text-muted">暂无成员</td></tr>
            ) : list.map((c) => (
              <tr key={c.id} className="border-b border-border-default hover:bg-bg-card/30">
                <td className="py-2 px-3 font-bold text-text-primary">{c.name}</td>
                <td className="py-2 px-3 text-text-muted">
                  {[c.class, c.spec].filter(Boolean).join(" · ") || "未设置"}
                </td>
                <td className="py-2 px-3">{ROLES.find((r) => r.value === c.role)?.label || "未设置"}</td>
                <td className="py-2 px-3 text-wow-gold font-mono">{c.itemLevel || '-'}</td>
                <td className="py-2 px-3 text-wow-purple font-mono">{c.mythicScore || '-'}</td>
                <td className="py-2 px-3">
                  <select value={c.status} onChange={(e) => update(c.id, { status: e.target.value })}
                    className="text-xs bg-bg-secondary border border-border-default rounded px-1 py-0.5 text-text-primary">
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </td>
                <td className="py-2 px-3">
                  <button onClick={() => update(c.id, { isPublic: !c.isPublic })}
                    className={`text-xs px-2 py-0.5 rounded ${c.isPublic ? 'bg-wow-green/20 text-wow-green' : 'bg-text-muted/20 text-text-muted'}`}>
                    {c.isPublic ? "公开" : "隐藏"}
                  </button>
                </td>
                <td className="py-2 px-3">
                  <button onClick={() => remove(c.id)} className="p-1 text-wow-red hover:bg-wow-red/10 rounded">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}