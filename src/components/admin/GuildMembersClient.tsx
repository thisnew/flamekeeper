"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, Save, Search, Users } from "lucide-react";
import toast from "react-hot-toast";

type MemberRow = {
  id: string;
  characterName: string;
  realmTitle: string;
  /** 中文服务器名（字典表）；查不到时等于 realmTitle */
  realmName: string;
  className: string | null;
  specName: string | null;
  specRole: string | null;
  rank: number | null;
  /** 已经过 WTF 验证并绑定到站内用户 */
  verified: boolean;
  /** 名下挂了几个站内角色 */
  boundCount: number;
  /** 绑定的主力角色（若有） */
  isMain: boolean;
  user: { name: string | null; email: string; guildRank: string } | null;
};

type Payload = {
  config: { region: string; realm: string; guildName: string; accessKeySet: boolean };
  syncedAt: string | null;
  syncedCount: number | null;
  lastError: string | null;
  total: number;
  members: MemberRow[];
};

import { classLabel, specLabel, roleLabel } from "@/lib/wow-i18n";

export default function GuildMembersClient({ canEdit }: { canEdit: boolean }) {
  const [data, setData] = useState<Payload | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"save" | "sync" | null>(null);
  const [form, setForm] = useState({ region: "cn", realm: "", guildName: "", accessKey: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/guild-members");
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error || "加载失败");
        return;
      }
      setData(d);
      setForm((f) => ({
        ...f,
        region: d.config.region,
        realm: d.config.realm,
        guildName: d.config.guildName,
      }));
    } catch {
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveConfig() {
    setBusy("save");
    try {
      const res = await fetch("/api/admin/guild-members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error || "保存失败");
        return;
      }
      toast.success("配置已保存");
      setForm((f) => ({ ...f, accessKey: "" }));
      await load();
    } catch {
      toast.error("网络错误");
    } finally {
      setBusy(null);
    }
  }

  async function importMembers() {
    if (
      !confirm(
        "将从 Raider.IO 拉取公会成员名单并覆盖本地数据。\n\n" +
          "⚠ Raider.IO 的调用配额有限，请勿频繁点击。确定继续？"
      )
    )
      return;
    setBusy("sync");
    try {
      const res = await fetch("/api/admin/guild-members", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error || "导入失败", { duration: 12000 });
        await load();
        return;
      }
      toast.success(d.message || "导入完成", { duration: 6000 });
      await load();
    } catch {
      toast.error("网络错误");
    } finally {
      setBusy(null);
    }
  }

  // 只看「已验证 / 未绑定用户」
  const [bindFilter, setBindFilter] = useState<"all" | "verified" | "unbound">("all");

  const allMembers = data?.members ?? [];
  const verifiedCount = allMembers.filter((m) => m.verified).length;
  const unboundCount = allMembers.length - verifiedCount;

  const filtered = allMembers.filter((m) => {
    if (bindFilter === "verified" && !m.verified) return false;
    if (bindFilter === "unbound" && m.verified) return false;
    const n = q.trim().toLowerCase();
    if (!n) return true;
    return (
      m.characterName.toLowerCase().includes(n) ||
      m.realmTitle.toLowerCase().includes(n) ||
      (m.className ?? "").toLowerCase().includes(n) ||
      (m.specName ?? "").toLowerCase().includes(n) ||
      // 中文也要能搜：用户打的是「潜行者」「敏锐」，不是 "Rogue"
      (classLabel(m.className) ?? "").toLowerCase().includes(n) ||
      (specLabel(m.specName, m.className) ?? "").toLowerCase().includes(n) ||
      (roleLabel(m.specRole) ?? "").toLowerCase().includes(n) ||
      // 也按站内用户名 / 邮箱搜，方便「这个人在公会名单里吗」
      (m.user?.name ?? "").toLowerCase().includes(n) ||
      (m.user?.email ?? "").toLowerCase().includes(n)
    );
  });

  return (
    <div className="space-y-5">
      {/* ---- 配置 ---- */}
      <div className="border border-border-default rounded bg-bg-card p-5 space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">地区（region）</label>
            <select
              value={form.region}
              disabled={!canEdit || busy !== null}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none disabled:opacity-60"
            >
              <option value="cn">cn（国服）</option>
              <option value="us">us</option>
              <option value="eu">eu</option>
              <option value="tw">tw</option>
              <option value="kr">kr</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">服务器（中文名或英文均可）</label>
            <input
              value={form.realm}
              disabled={!canEdit || busy !== null}
              onChange={(e) => setForm({ ...form, realm: e.target.value })}
              placeholder="回音山"
              className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">公会名</label>
            <input
              value={form.guildName}
              disabled={!canEdit || busy !== null}
              onChange={(e) => setForm({ ...form, guildName: e.target.value })}
              placeholder="Eternal Flame"
              className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1">
            Raider.IO access_key
            {data?.config.accessKeySet && (
              <span className="ml-2 text-emerald-400">已配置（留空表示不修改）</span>
            )}
          </label>
          <input
            type="password"
            value={form.accessKey}
            disabled={!canEdit || busy !== null}
            onChange={(e) => setForm({ ...form, accessKey: e.target.value })}
            placeholder={data?.config.accessKeySet ? "••••••••（留空即不修改）" : "RIOA…"}
            className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none disabled:opacity-60"
          />
          <p className="text-xs text-text-muted mt-1">
            带 key 的调用配额更高。密钥会**加密存储**，不会回传到浏览器。
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveConfig}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-border-default text-text-secondary rounded hover:border-wow-gold hover:text-wow-gold transition-colors disabled:opacity-50"
            >
              {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              保存配置
            </button>
            <button
              type="button"
              onClick={importMembers}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright transition-colors disabled:opacity-50"
            >
              {busy === "sync" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              {busy === "sync" ? "正在导入…" : "从 Raider.IO 导入公会成员"}
            </button>
            <span className="text-xs text-text-muted">
              ⚠ 会真实调用 Raider.IO，配额有限，请勿频繁点击
            </span>
          </div>
        )}
      </div>

      {/* ---- 状态 ---- */}
      <div className="border border-border-default rounded bg-bg-card p-5">
        <p className="text-sm text-text-primary font-semibold">
          本地公名单：<span className="text-wow-gold">{data?.total ?? 0}</span> 名成员
        </p>
        <p className="text-xs text-text-muted mt-1">
          {data?.syncedAt ? (
            <>
              上次导入：<span className="text-text-secondary">{new Date(data.syncedAt).toLocaleString("zh-CN")}</span>
              {data.syncedCount != null && ` （抓取 ${data.syncedCount} 条）`}
            </>
          ) : (
            <span className="text-amber-400">尚未导入过</span>
          )}
        </p>
        {data?.lastError && (
          <p className="mt-3 p-3 text-xs bg-wow-red/10 border border-wow-red/30 rounded text-wow-red flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>上次失败原因：{data.lastError}</span>
          </p>
        )}
      </div>

      {/* ---- 成员列表 ---- */}
      {data && data.total > 0 && (
        <>
          {/* 绑定状态统计 + 筛选 */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-text-muted">共 {allMembers.length} 人：</span>
            {(
              [
                ["all", `全部 ${allMembers.length}`, null],
                ["verified", `已验证 ${verifiedCount}`, "text-emerald-400 border-emerald-400/40 bg-emerald-400/10"],
                ["unbound", `未绑定用户 ${unboundCount}`, "text-text-muted border-border-default"],
              ] as const
            ).map(([key, label, activeCls]) => (
              <button
                key={key}
                type="button"
                onClick={() => setBindFilter(key)}
                className={`px-2 py-1 rounded border transition-colors ${
                  bindFilter === key
                    ? activeCls ?? "text-wow-gold border-wow-gold/50 bg-wow-gold/10"
                    : "text-text-muted border-border-default hover:text-text-secondary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索角色名 / 服务器 / 职业 / 站内用户名"
              className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none"
            />
          </div>

          {loading ? (
            <p className="py-10 text-center text-text-muted flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
            </p>
          ) : (
            <div className="border border-border-default rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-bg-secondary/60 text-text-muted">
                  <tr>
                    <th className="text-left px-4 py-2 font-normal">角色名</th>
                    <th className="text-left px-4 py-2 font-normal">站内用户</th>
                    <th className="text-left px-4 py-2 font-normal">服务器</th>
                    <th className="text-left px-4 py-2 font-normal">职业</th>
                    <th className="text-left px-4 py-2 font-normal">专精</th>
                    <th className="text-left px-4 py-2 font-normal">职能</th>
                    <th className="text-left px-4 py-2 font-normal">职级</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr
                      key={`${m.realmTitle}/${m.characterName}`}
                      className="border-t border-border-default hover:bg-bg-card/40"
                    >
                      <td className="px-4 py-2 text-text-primary">{m.characterName}</td>
                      <td className="px-4 py-2">
                        {m.verified ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-xs px-1.5 py-0.5 rounded border text-emerald-400 border-emerald-400/40 bg-emerald-400/10">
                              已验证
                            </span>
                            <span className="text-text-secondary">
                              {m.user?.name || m.user?.email || "—"}
                            </span>
                            {m.boundCount > 1 && (
                              <span className="text-xs text-text-muted">
                                +{m.boundCount - 1}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">未绑定用户</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-text-muted">{m.realmName}</td>
                      <td className="px-4 py-2 text-text-secondary">
                        {classLabel(m.className) ?? "-"}
                      </td>
                      <td className="px-4 py-2 text-text-muted">
                        {specLabel(m.specName, m.className) ?? "-"}
                      </td>
                      <td className="px-4 py-2 text-text-muted">
                        {roleLabel(m.specRole) ?? "-"}
                      </td>
                      <td className="px-4 py-2 text-text-muted">{m.rank ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-4 py-2 text-xs text-text-muted bg-bg-secondary/40">
                显示 {filtered.length} 条
                {data.total > data.members.length && `（共 ${data.total} 名，列表最多展示 ${data.members.length} 条，可用搜索缩小范围）`}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
