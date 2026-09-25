"use client";

import { useState } from "react";
import { CheckCircle2, List, Network, Search, Shield, User as UserIcon } from "lucide-react";
import { cn, CLASS_COLORS } from "@/lib/utils";
import { classLabel, specLabel, roleLabel } from "@/lib/wow-i18n";
import { GUILD_RANK_LABELS } from "@/lib/guild-rank";
import ReferralTree, { type TreeNode } from "@/components/guild/ReferralTree";

/** 已绑定的对号标识 —— 与「注册成功」一致的视觉语言。 */
function BoundBadge({ bound, label }: { bound: boolean; label?: string }) {
  if (!bound) {
    return <span className="text-xs text-text-muted">未绑定</span>;
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border text-wow-green border-wow-green/40 bg-wow-green/10"
      title="已绑定公会名单"
    >
      <CheckCircle2 className="w-3.5 h-3.5" />
      {label ?? "已绑定"}
    </span>
  );
}

type DisplayChar = {
  id: string;
  name: string;
  className: string | null;
  specName: string | null;
  specRole: string | null;
  realm: string;
  isMain: boolean;
  bound: boolean;
};

type RosterMember = {
  id: string;
  name: string;
  role: string;
  guildRank: string;
  main: DisplayChar | null;
  characterCount: number;
  boundCount: number;
};

type GuildCharacterRow = {
  id: string;
  name: string;
  realm: string;
  className: string | null;
  specName: string | null;
  specRole: string | null;
  rank: number | null;
  bound: boolean;
  isMain: boolean;
  owner: { name: string | null; guildRank: string } | null;
  boundCount: number;
};

const ROLE_LABELS: Record<string, string> = {
  MEMBER: "成员",
  OFFICER: "官员",
  ADMIN: "管理员",
};

export default function RosterTabs({
  members,
  guildCharacters,
  treeRoots,
}: {
  members: RosterMember[];
  guildCharacters: GuildCharacterRow[];
  treeRoots: TreeNode[];
}) {
  const [tab, setTab] = useState<"members" | "characters" | "tree">("members");
  const [q, setQ] = useState("");
  const [bindFilter, setBindFilter] = useState<"all" | "bound" | "unbound">("all");

  const n = q.trim().toLowerCase();
  const matchBind = (bound: boolean) =>
    bindFilter === "all" || (bindFilter === "bound" ? bound : !bound);

  const filteredMembers = members.filter((m) => {
    if (!matchBind(m.boundCount > 0)) return false;
    if (!n) return true;
    return (
      m.name.toLowerCase().includes(n) ||
      (m.main?.name ?? "").toLowerCase().includes(n) ||
      (classLabel(m.main?.className) ?? "").toLowerCase().includes(n)
    );
  });

  const filteredChars = guildCharacters.filter((c) => {
    if (!matchBind(c.bound)) return false;
    if (!n) return true;
    return (
      c.name.toLowerCase().includes(n) ||
      c.realm.toLowerCase().includes(n) ||
      (c.owner?.name ?? "").toLowerCase().includes(n) ||
      (classLabel(c.className) ?? "").toLowerCase().includes(n)
    );
  });

  const boundCharCount = guildCharacters.filter((c) => c.bound).length;

  const tabs = [
    { key: "members" as const, icon: UserIcon, label: `会员展示 ${members.length}` },
    {
      key: "characters" as const,
      icon: Shield,
      label: `公会角色展示 ${guildCharacters.length}`,
    },
    { key: "tree" as const, icon: Network, label: "引荐结构" },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 text-sm rounded transition-colors",
              tab === t.key ? "bg-wow-gold text-black font-bold" : "text-text-secondary hover:text-wow-gold"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab !== "tree" && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tab === "members" ? "搜索成员 / 主力角色 / 职业" : "搜索角色 / 服务器 / 隶属成员"}
              className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none"
            />
          </div>
          {(
            [
              ["all", `全部`, null],
              ["bound", `已绑定 ${tab === "members" ? members.filter((m) => m.boundCount > 0).length : boundCharCount}`, "text-wow-green border-wow-green/40 bg-wow-green/10"],
              ["unbound", `未绑定 ${tab === "members" ? members.filter((m) => m.boundCount === 0).length : guildCharacters.length - boundCharCount}`, null],
            ] as const
          ).map(([key, label, activeCls]) => (
            <button
              key={key}
              type="button"
              onClick={() => setBindFilter(key)}
              className={cn(
                "px-2 py-1 rounded border transition-colors",
                bindFilter === key
                  ? activeCls ?? "text-wow-gold border-wow-gold/50 bg-wow-gold/10"
                  : "text-text-muted border-border-default hover:text-text-secondary"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ---- 会员展示（用户维度）---- */}
      {tab === "members" && (
        <div className="border border-border-default rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary/60">
              <tr>
                <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider">成员</th>
                <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider">会阶</th>
                <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider">主力角色</th>
                <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider hidden sm:table-cell">服务器</th>
                <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider">绑定</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => (
                <tr key={m.id} className="border-b border-border-default hover:bg-bg-card-hover/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-text-primary">{m.name}</span>
                    <span className="ml-2 text-xs text-text-muted">
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-text-muted">
                    {GUILD_RANK_LABELS[m.guildRank as keyof typeof GUILD_RANK_LABELS] ?? m.guildRank}
                  </td>
                  <td className="py-3 px-4">
                    {m.main ? (
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className={cn("font-medium", CLASS_COLORS[m.main.className ?? ""] || "text-text-secondary")}>
                          {m.main.name}
                        </span>
                        <span className="text-xs text-text-muted">
                          {[classLabel(m.main.className), specLabel(m.main.specName, m.main.className)]
                            .filter(Boolean)
                            .join(" · ") || "未设置"}
                        </span>
                        {m.main.isMain && (
                          <span className="text-xs text-wow-gold" title="主力角色">
                            ★
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-text-muted">未登记角色</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-text-muted hidden sm:table-cell">
                    {m.main?.realm ?? "-"}
                  </td>
                  <td className="py-3 px-4">
                    <BoundBadge bound={m.boundCount > 0} label={m.boundCount > 0 ? `已绑定 ${m.boundCount}` : undefined} />
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-text-muted">
                    没有匹配的成员
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- 公会角色展示（角色维度）---- */}
      {tab === "characters" && (
        <div className="border border-border-default rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary/60">
              <tr>
                <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider">角色</th>
                <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider">服务器</th>
                <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider">职业</th>
                <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider hidden sm:table-cell">专精</th>
                <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider hidden sm:table-cell">职能</th>
                <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider">隶属成员</th>
              </tr>
            </thead>
            <tbody>
              {filteredChars.map((c) => (
                <tr key={c.id} className="border-b border-border-default hover:bg-bg-card-hover/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className={cn("font-medium", CLASS_COLORS[c.className ?? ""] || "text-text-secondary")}>
                      {c.name}
                    </span>
                    {c.isMain && (
                      <span className="ml-2 text-xs text-wow-gold" title="该成员的主力">
                        ★
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-text-muted">{c.realm}</td>
                  <td className="py-3 px-4 text-text-secondary">{classLabel(c.className) ?? "-"}</td>
                  <td className="py-3 px-4 text-text-muted hidden sm:table-cell">
                    {specLabel(c.specName, c.className) ?? "-"}
                  </td>
                  <td className="py-3 px-4 text-text-muted hidden sm:table-cell">
                    {roleLabel(c.specRole) ?? "-"}
                  </td>
                  <td className="py-3 px-4">
                    <BoundBadge
                      bound={c.bound}
                      label={c.owner ? c.owner.name || "已绑定" : undefined}
                    />
                  </td>
                </tr>
              ))}
              {filteredChars.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-text-muted">
                    没有匹配的角色
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- 引荐结构 ---- */}
      {tab === "tree" && <ReferralTree roots={treeRoots} />}
    </div>
  );
}
