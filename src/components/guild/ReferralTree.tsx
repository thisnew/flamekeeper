"use client";

import { useState, useMemo } from "react";
import {
  ChevronRight, Crown, Shield, Swords, Flame, User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TreeNode {
  id: string;
  name: string;
  role: string;
  /** 会阶（LEADER / RAID_LEADER / CORE / MEMBER）—— 徽章按它显示，与 role 解耦 */
  guildRank: string;
  email?: string | null;
  character?: {
    name: string;
    class: string;
    spec: string;
    role: string;
  } | null;
  children: TreeNode[];
}

const CLASS_COLOR_HEX: Record<string, string> = {
  Warrior: "#C79C6E", Paladin: "#F58CBA", Hunter: "#AAD372", Rogue: "#FFF569",
  Priest: "#FFFFFF", "Death Knight": "#C41E3A", Shaman: "#0070DE", Mage: "#69CCF0",
  Warlock: "#9482C9", Monk: "#00FF96", Druid: "#FF7D0A", "Demon Hunter": "#A330C9",
  Evoker: "#33937F",
};

/**
 * 结构图徽章按**会阶**显示，不再按系统权限 role。
 *
 * 历史问题：以前这里是 ROLE_META 且把 ADMIN 直接标成「会长」——
 * 但管理员是站点超级管理员，与会长是两个维度（见 lib/guild-rank.ts）。
 */
const RANK_META: Record<string, { label: string; icon: any; cls: string }> = {
  LEADER: { label: "会长", icon: Crown, cls: "text-wow-gold border-wow-gold/40 bg-wow-gold/10" },
  RAID_LEADER: { label: "团长", icon: Swords, cls: "text-wow-orange border-wow-orange/40 bg-wow-orange/10" },
  CORE: { label: "核心", icon: Shield, cls: "text-wow-blue-light border-wow-blue/40 bg-wow-blue/10" },
  MEMBER: { label: "成员", icon: UserIcon, cls: "text-wow-green border-wow-green/30 bg-wow-green-dark/10" },
};

function countDescendants(node: TreeNode): number {
  return node.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);
}

function collectIds(node: TreeNode, acc: string[] = []): string[] {
  acc.push(node.id);
  for (const c of node.children) collectIds(c, acc);
  return acc;
}

export default function ReferralTree({ roots }: { roots: TreeNode[] }) {
  // Default: expand the first two levels so the shape is visible at a glance
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const allIds = useMemo(() => roots.flatMap((r) => collectIds(r)), [roots]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const collapseAll = () => setCollapsed(new Set(allIds));
  const expandAll = () => setCollapsed(new Set());

  if (roots.length === 0) {
    return (
      <div className="text-center py-20 text-text-muted border border-border-default rounded bg-bg-card">
        <Flame className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>暂无成员引荐关系</p>
      </div>
    );
  }

  const total = allIds.length;

  return (
    <div className="bg-bg-card border border-border-default rounded p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-border-default">
        <div className="text-sm text-text-muted">
          共 <span className="text-wow-gold font-bold">{total}</span> 位成员 ·
          <span className="ml-1">{roots.length} 个引荐源头</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-xs border border-border-gold text-wow-gold rounded hover:bg-wow-gold/10 transition-colors"
          >
            全部展开
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-xs border border-border-default text-text-muted rounded hover:text-text-primary transition-colors"
          >
            全部折叠
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <ul className="space-y-1 min-w-[280px]">
          {roots.map((node) => (
            <TreeItem key={node.id} node={node} depth={0} collapsed={collapsed} onToggle={toggle} />
          ))}
        </ul>
      </div>

      <div className="mt-6 pt-4 border-t border-border-default text-xs text-text-muted">
        提示：节点可点击箭头折叠／展开；下级为「由该成员审批通过（引荐）入会」的成员。
      </div>
    </div>
  );
}

function TreeItem({
  node,
  depth,
  collapsed,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
}) {
  const isCollapsed = collapsed.has(node.id);
  const hasChildren = node.children.length > 0;
  const meta = RANK_META[node.guildRank] ?? RANK_META.MEMBER;
  const RoleIcon = meta.icon;
  const classColor = node.character ? CLASS_COLOR_HEX[node.character.class] : undefined;
  const descendants = hasChildren ? countDescendants(node) : 0;

  return (
    <li>
      <div className="flex items-stretch">
        {/* connector column */}
        <div className="flex items-center shrink-0" aria-hidden>
          {depth > 0 && (
            <>
              <span className="w-3 sm:w-5 border-t border-wow-gold/25 self-center" />
            </>
          )}
          <button
            onClick={() => hasChildren && onToggle(node.id)}
            disabled={!hasChildren}
            aria-label={hasChildren ? (isCollapsed ? "展开" : "折叠") : "无下级"}
            className={cn(
              "w-6 h-6 flex items-center justify-center rounded transition-colors",
              hasChildren
                ? "text-wow-gold hover:bg-wow-gold/15 cursor-pointer"
                : "text-text-muted/30 cursor-default"
            )}
          >
            <ChevronRight
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                hasChildren && !isCollapsed && "rotate-90"
              )}
            />
          </button>
        </div>

        {/* node card */}
        <div className="flex-1 min-w-0 py-0.5">
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 px-3 py-2 rounded-md border bg-bg-secondary/40",
              "border-border-default hover:border-border-gold/60 transition-colors"
            )}
          >
            <RoleIcon className={cn("w-4 h-4 shrink-0", meta.cls.split(" ")[0])} />

            <span className="font-bold text-text-primary truncate" style={{ color: classColor }}>
              {node.name || node.email}
            </span>

            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", meta.cls)}>
              {meta.label}
            </span>

            {node.character && (
              <span className="text-xs text-text-muted truncate">
                {node.character.name}
                {[node.character.class, node.character.spec].filter(Boolean).length > 0 &&
                  ` · ${[node.character.class, node.character.spec].filter(Boolean).join(" · ")}`}
              </span>
            )}

            {hasChildren && (
              <span className="ml-auto text-[10px] text-wow-gold/70 shrink-0">
                引荐 {descendants}
                {isCollapsed ? " · 已折叠" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* children */}
      {hasChildren && !isCollapsed && (
        <ul className="mt-1 ml-3 sm:ml-5 border-l border-wow-gold/20 pl-0.5 space-y-1">
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}