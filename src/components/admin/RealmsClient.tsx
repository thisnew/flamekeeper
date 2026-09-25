"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Search } from "lucide-react";
import toast from "react-hot-toast";

type RealmRow = {
  name: string;
  slug: string;
  category: string | null;
  typeName: string | null;
  populationName: string | null;
  statusName: string | null;
};

type Status = {
  syncedAt: string | null;
  syncedCount: number | null;
  total: number;
  source: string;
};

export default function RealmsClient({ canEdit }: { canEdit: boolean }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [realms, setRealms] = useState<RealmRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/realms?q=${encodeURIComponent(query)}`);
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "加载失败");
        return;
      }
      setStatus({ syncedAt: d.syncedAt, syncedCount: d.syncedCount, total: d.total, source: d.source });
      setRealms(d.realms || []);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  // 搜索做防抖，避免每敲一个字就打一次接口
  useEffect(() => {
    const t = setTimeout(() => load(q), 300);
    return () => clearTimeout(t);
  }, [q, load]);

  async function sync() {
    if (!confirm("将从暴雪国服接口抓取最新服务器列表并覆盖本地字典，确定继续？")) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/realms", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error || "更新失败", { duration: 10000 });
        // 失败时也刷新一下，让界面上的状态是最新的
        await load(q);
        return;
      }
      toast.success(d.message || "更新完成");
      setQ("");
      await load("");
    } catch {
      toast.error("网络错误");
    } finally {
      setSyncing(false);
    }
  }

  const syncedLabel = status?.syncedAt
    ? new Date(status.syncedAt).toLocaleString("zh-CN")
    : null;

  return (
    <div className="space-y-5">
      {/* ---- 状态卡片 ---- */}
      <div className="border border-border-default rounded bg-bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-text-primary font-semibold">
              本地字典：<span className="text-wow-gold">{status?.total ?? 0}</span> 个服务器
            </p>
            <p className="text-xs text-text-muted">
              {syncedLabel ? (
                <>
                  上次更新：<span className="text-text-secondary">{syncedLabel}</span>
                  {status?.syncedCount != null && ` （抓取 ${status.syncedCount} 条）`}
                </>
              ) : (
                <span className="text-amber-400">尚未更新过 —— 请点右侧按钮抓取</span>
              )}
            </p>
            {status?.source && (
              <p className="text-xs text-text-muted break-all">
                数据源：<code className="text-text-secondary">{status.source}</code>
              </p>
            )}
          </div>

          {canEdit ? (
            <button
              type="button"
              onClick={sync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright transition-colors disabled:opacity-50"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {syncing ? "正在更新…" : "立即更新服务器数据"}
            </button>
          ) : (
            <p className="text-xs text-text-muted border border-border-default rounded px-3 py-2">
              你是以<strong className="text-text-secondary">官员</strong>身份查看，
              更新仅限管理员。
            </p>
          )}
        </div>

        {syncing && (
          <p className="mt-3 text-xs text-text-muted">
            正在抓取约 360 条记录并写入本地，通常几秒完成，请勿关闭页面。
          </p>
        )}
      </div>

      {/* ---- 搜索 ---- */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索中文名或英文名，如 燃烧之刃 / burning-blade"
          className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none"
        />
      </div>

      {/* ---- 错误 ---- */}
      {error && (
        <div className="p-3 bg-wow-red/10 border border-wow-red/30 rounded text-sm text-wow-red flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ---- 列表 ---- */}
      {loading && realms.length === 0 ? (
        <p className="py-12 text-center text-text-muted flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
        </p>
      ) : realms.length === 0 ? (
        <p className="py-12 text-center text-text-muted border border-border-default rounded bg-bg-card">
          {status?.total === 0
            ? "还没有服务器数据，请先点「立即更新服务器数据」。"
            : "没有匹配的服务器。"}
        </p>
      ) : (
        <div className="border border-border-default rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary/60 text-text-muted">
              <tr>
                <th className="text-left px-4 py-2 font-normal">中文名</th>
                <th className="text-left px-4 py-2 font-normal">英文名（slug）</th>
                <th className="text-left px-4 py-2 font-normal">大区</th>
                <th className="text-left px-4 py-2 font-normal">类型</th>
                <th className="text-left px-4 py-2 font-normal">人口</th>
              </tr>
            </thead>
            <tbody>
              {realms.map((r) => (
                <tr key={r.slug} className="border-t border-border-default hover:bg-bg-card/40">
                  <td className="px-4 py-2 text-text-primary">{r.name}</td>
                  <td className="px-4 py-2 text-wow-gold font-mono text-xs">{r.slug}</td>
                  <td className="px-4 py-2 text-text-muted">{r.category ?? "-"}</td>
                  <td className="px-4 py-2 text-text-muted">{r.typeName ?? "-"}</td>
                  <td className="px-4 py-2 text-text-muted">{r.populationName ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-text-muted bg-bg-secondary/40 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            显示 {realms.length} 条{status && status.total > realms.length ? `（共 ${status.total} 条，可用搜索缩小范围）` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
