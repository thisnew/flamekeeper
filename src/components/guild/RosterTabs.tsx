"use client";

import { useState } from "react";
import { List, Network, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLASS_COLORS } from "@/lib/utils";
import ReferralTree, { type TreeNode } from "@/components/guild/ReferralTree";

interface RosterCharacter {
  id: string;
  name: string;
  server: string;
  class: string;
  spec: string;
  role: string;
  itemLevel: number | null;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "主力",
  BENCH: "替补",
  CASUAL: "休闲",
  LEFT: "已离会",
};

export default function RosterTabs({
  characters,
  treeRoots,
}: {
  characters: RosterCharacter[];
  treeRoots: TreeNode[];
}) {
  const [tab, setTab] = useState<"list" | "tree">("list");

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex gap-2 p-1 bg-bg-card border border-border-default rounded-lg">
          <button
            onClick={() => setTab("list")}
            className={cn(
              "flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-md transition-colors",
              tab === "list" ? "bg-wow-gold text-black" : "text-text-secondary hover:text-wow-gold"
            )}
          >
            <List className="w-4 h-4" /> 名册
            <span className="text-xs opacity-70">({characters.length})</span>
          </button>
          <button
            onClick={() => setTab("tree")}
            className={cn(
              "flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-md transition-colors",
              tab === "tree" ? "bg-wow-gold text-black" : "text-text-secondary hover:text-wow-gold"
            )}
          >
            <Network className="w-4 h-4" /> 结构图
          </button>
        </div>
      </div>

      {tab === "list" ? (
        <div className="bg-bg-card border border-border-default rounded p-6">
          {characters.length === 0 ? (
            <div className="text-center py-16 text-text-muted">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>成员名册暂未开放</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-gold">
                    <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider">角色</th>
                    <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider">职业</th>
                    <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider">专精</th>
                    <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider">职能</th>
                    <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider hidden sm:table-cell">服务器</th>
                    <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider hidden md:table-cell">装等</th>
                    <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {characters.map((char) => (
                    <tr key={char.id} className="border-b border-border-default hover:bg-bg-card-hover/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-text-primary">{char.name}</span>
                      </td>
                      <td className={`py-3 px-4 font-medium ${CLASS_COLORS[char.class] || "text-text-secondary"}`}>
                        {char.class}
                      </td>
                      <td className="py-3 px-4 text-text-muted">{char.spec}</td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            char.role === "Tank"
                              ? "bg-wow-blue/20 text-wow-blue-light"
                              : char.role === "Healer"
                                ? "bg-wow-green/20 text-wow-green"
                                : "bg-wow-red/20 text-wow-red"
                          )}
                        >
                          {char.role === "Tank" ? "坦克" : char.role === "Healer" ? "治疗" : "DPS"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-text-muted hidden sm:table-cell">{char.server}</td>
                      <td className="py-3 px-4 text-text-muted hidden md:table-cell">
                        {char.itemLevel ? (
                          <span
                            className={cn(
                              "font-mono",
                              char.itemLevel >= 630
                                ? "text-wow-purple"
                                : char.itemLevel >= 610
                                  ? "text-wow-blue-light"
                                  : "text-text-secondary"
                            )}
                          >
                            {char.itemLevel}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "text-xs",
                            char.status === "ACTIVE"
                              ? "text-wow-green"
                              : char.status === "BENCH"
                                ? "text-wow-gold"
                                : "text-text-muted"
                          )}
                        >
                          {STATUS_LABELS[char.status] || char.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <ReferralTree roots={treeRoots} />
      )}
    </div>
  );
}