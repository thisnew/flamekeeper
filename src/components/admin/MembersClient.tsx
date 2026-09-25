"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Users } from "lucide-react";
import toast from "react-hot-toast";
import {
  GUILD_RANKS,
  GUILD_RANK_LABELS,
  guildRankStyle,
  type GuildRank,
} from "@/lib/guild-rank";

export type MemberRow = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  guildRank: string;
  referredById: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  USER: "注册用户",
  MEMBER: "公会成员",
  OFFICER: "官员",
  ADMIN: "管理员",
};

export default function MembersClient({
  initial,
  canEdit,
}: {
  initial: MemberRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const byId = useMemo(() => {
    const m = new Map<string, MemberRow>();
    for (const r of initial) m.set(r.id, r);
    return m;
  }, [initial]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return initial;
    return initial.filter(
      (m) =>
        (m.name || "").toLowerCase().includes(needle) ||
        m.email.toLowerCase().includes(needle)
    );
  }, [initial, q]);

  async function patch(id: string, payload: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "更新失败");
        // 服务端可能因为成环而拒绝 —— 刷新以回滚界面上的选择
        router.refresh();
        return;
      }
      toast.success(data.message || "已更新");
      router.refresh();
    } catch {
      toast.error("网络错误，请稍后再试");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索昵称或邮箱…"
          className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none"
        />
      </div>

      {!canEdit && (
        <p className="mb-4 text-xs text-text-muted border border-border-default rounded bg-bg-card px-4 py-3">
          你是以<strong className="text-text-secondary">官员</strong>身份查看，可以浏览但不能修改
          —— 调整会阶与引荐关系仅限管理员。
        </p>
      )}

      {visible.length === 0 ? (
        <p className="py-16 text-center text-text-muted border border-border-default rounded bg-bg-card">
          没有匹配的成员。
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((m) => {
            const busy = busyId === m.id;
            const referrer = m.referredById ? byId.get(m.referredById) : null;
            return (
              <li
                key={m.id}
                className="bg-bg-card border border-border-default rounded p-4 flex flex-wrap items-center gap-3"
              >
                <Users className="w-5 h-5 text-wow-gold shrink-0" />

                <div className="min-w-[10rem]">
                  <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    {m.name || "(未设昵称)"}
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded border ${guildRankStyle(m.guildRank)}`}
                    >
                      {GUILD_RANK_LABELS[m.guildRank as GuildRank] ?? m.guildRank}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted">{m.email}</div>
                </div>

                <div className="text-xs text-text-muted">
                  权限：{ROLE_LABELS[m.role] ?? m.role}
                </div>

                <div className="text-xs text-text-muted">
                  引荐人：
                  <span className="text-text-secondary">
                    {referrer ? referrer.name || referrer.email : "无（根节点）"}
                  </span>
                </div>

                {canEdit && (
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    {busy && <Loader2 className="w-4 h-4 animate-spin text-wow-gold" />}

                    <label className="text-xs text-text-muted">会阶</label>
                    <select
                      value={m.guildRank}
                      disabled={busy}
                      onChange={(e) => patch(m.id, { guildRank: e.target.value })}
                      className="text-xs bg-bg-secondary border border-border-default rounded px-2 py-1.5 text-text-secondary focus:border-wow-gold focus:outline-none"
                    >
                      {GUILD_RANKS.map((r) => (
                        <option key={r} value={r}>
                          {GUILD_RANK_LABELS[r]}
                        </option>
                      ))}
                    </select>

                    <label className="text-xs text-text-muted">引荐人</label>
                    <select
                      value={m.referredById ?? ""}
                      disabled={busy}
                      onChange={(e) =>
                        patch(m.id, { referredById: e.target.value || null })
                      }
                      className="text-xs bg-bg-secondary border border-border-default rounded px-2 py-1.5 text-text-secondary focus:border-wow-gold focus:outline-none max-w-[12rem]"
                    >
                      <option value="">无（根节点）</option>
                      {initial
                        .filter((x) => x.id !== m.id)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name || x.email}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
