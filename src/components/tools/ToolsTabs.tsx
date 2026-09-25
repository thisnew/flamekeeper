"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Puzzle, FileText, Download, Plus, Paperclip, ExternalLink, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { displayName } from "@/lib/privacy";
const CATEGORY_LABELS: Record<string, string> = {
  RAID: "团本", MPLUS: "大秘境", PVP: "PVP", UI: "界面美化",
  CLASS: "职业专精", WEAKAURA: "WeakAuras", MACRO: "宏命令", TOOL: "工具",
};

export interface ToolAddon {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  gameVersion: string | null;
  downloadUrl: string | null;
  waString: string | null;
  isRecommended: boolean;
}

export interface ToolShare {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  createdAt: string | Date;
  attachmentName: string | null;
  attachmentSize: number | null;
  author: { name: string | null; email: string };
}

function formatSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ToolsTabs({
  addons,
  shares,
  canPublish,
}: {
  addons: ToolAddon[];
  shares: ToolShare[];
  canPublish: boolean;
}) {
  const [tab, setTab] = useState<"addons" | "shares">("addons");

  return (
    <div>
      {/* Tabs + publish action */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex gap-2 p-1 bg-bg-card border border-border-default rounded-lg">
          <button
            onClick={() => setTab("addons")}
            className={cn(
              "flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-md transition-colors",
              tab === "addons"
                ? "bg-wow-gold text-black"
                : "text-text-secondary hover:text-wow-gold"
            )}
          >
            <Puzzle className="w-4 h-4" /> 插件分享
            <span className="text-xs opacity-70">({addons.length})</span>
          </button>
          <button
            onClick={() => setTab("shares")}
            className={cn(
              "flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-md transition-colors",
              tab === "shares"
                ? "bg-wow-gold text-black"
                : "text-text-secondary hover:text-wow-gold"
            )}
          >
            <FileText className="w-4 h-4" /> 其他分享
            <span className="text-xs opacity-70">({shares.length})</span>
          </button>
        </div>

        {tab === "shares" && canPublish && (
          <Link
            href="/tools/share/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-wow-gold text-black text-sm font-bold rounded hover:bg-wow-gold-bright transition-colors"
          >
            <Plus className="w-4 h-4" /> 发布分享
          </Link>
        )}
      </div>

      {/* Addons tab */}
      {tab === "addons" && (
        <>
          {addons.length === 0 ? (
            <div className="text-center py-20 text-text-muted border border-border-default rounded bg-bg-card">
              <Puzzle className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>插件分享正在建设中，敬请期待...</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {addons.map((addon) => (
                <Link
                  key={addon.id}
                  href={`/tools/addon/${addon.slug}`}
                  className="block bg-bg-card border border-border-default rounded p-6 hover:border-border-gold transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs px-2 py-0.5 bg-wow-gold/10 text-wow-gold border border-border-gold rounded">
                      {CATEGORY_LABELS[addon.category] || addon.category}
                    </span>
                    {addon.isRecommended && (
                      <span className="text-xs px-2 py-0.5 bg-wow-orange/10 text-wow-orange border border-wow-orange/30 rounded">
                        推荐
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-text-primary mb-2 hover:text-wow-gold transition-colors">
                    {addon.name}
                  </h3>
                  <p className="text-sm text-text-muted mb-4 line-clamp-2">{addon.description}</p>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    {addon.downloadUrl && (
                      <span className="flex items-center gap-1 text-wow-blue-light">
                        <Download className="w-3 h-3" /> 下载
                      </span>
                    )}
                    {addon.waString && (
                      <span className="flex items-center gap-1 text-wow-purple">
                        <Star className="w-3 h-3" /> WA
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Shares tab */}
      {tab === "shares" && (
        <>
          {shares.length === 0 ? (
            <div className="text-center py-20 text-text-muted border border-border-default rounded bg-bg-card">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="mb-1">还没有其他分享</p>
              {canPublish ? (
                <p className="text-xs">点击右上角「发布分享」分享你的工具、宏、配置或攻略</p>
              ) : (
                <p className="text-xs">仅审批通过的公会成员可以发布分享</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {shares.map((share) => (
                <Link
                  key={share.id}
                  href={`/tools/share/${share.slug}`}
                  className="block bg-bg-card border border-border-default rounded p-6 hover:border-border-gold hover:shadow-gold transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-lg text-text-primary hover:text-wow-gold transition-colors mb-2">
                        {share.title}
                      </h3>
                      {share.excerpt && (
                        <p className="text-sm text-text-muted line-clamp-2 mb-2">{share.excerpt}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                        <span>{new Date(share.createdAt).toLocaleDateString("zh-CN")}</span>
                        <span>· {displayName(share.author)}</span>
                        {share.attachmentName && (
                          <span className="flex items-center gap-1 text-wow-blue-light">
                            <Paperclip className="w-3 h-3" />
                            {share.attachmentName}
                            {share.attachmentSize ? ` (${formatSize(share.attachmentSize)})` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-text-muted shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}