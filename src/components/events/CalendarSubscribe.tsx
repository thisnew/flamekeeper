"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, RefreshCw, Rss } from "lucide-react";
import toast from "react-hot-toast";

/**
 * 日历订阅地址面板（仅官员可见）。
 *
 * 密钥由服务端按需生成，这里只负责展示与复制。
 * 轮换按钮仅管理员可用（服务端也会再校验一次）。
 */
export default function CalendarSubscribe({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [httpsUrl, setHttpsUrl] = useState("");
  const [webcalUrl, setWebcalUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || httpsUrl) return;
    setLoading(true);
    fetch("/api/events/ics-key")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          toast.error(d.error);
          return;
        }
        setHttpsUrl(d.httpsUrl);
        setWebcalUrl(d.webcalUrl);
      })
      .catch(() => toast.error("获取订阅地址失败"))
      .finally(() => setLoading(false));
  }, [open, httpsUrl]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setCopied(true);
      toast.success("已复制订阅地址");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败，请手动选中复制");
    }
  }

  async function rotate() {
    if (!confirm("轮换后所有旧的订阅链接会立即失效，需要在日历 App 里重新订阅。确定继续？")) {
      return;
    }
    setRotating(true);
    try {
      const res = await fetch("/api/events/ics-key", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error || "轮换失败");
        return;
      }
      setHttpsUrl(d.httpsUrl);
      setWebcalUrl(d.webcalUrl);
      toast.success(d.message || "已轮换");
    } catch {
      toast.error("网络错误");
    } finally {
      setRotating(false);
    }
  }

  return (
    <div className="border border-border-default rounded bg-bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-text-secondary hover:text-wow-gold transition-colors"
      >
        <Rss className="w-4 h-4" />
        订阅日历到手机 / Google Calendar
        <span className="ml-auto text-xs text-text-muted">{open ? "收起" : "展开"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border-default pt-4 space-y-3">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 className="w-4 h-4 animate-spin" /> 正在获取订阅地址…
            </p>
          ) : httpsUrl ? (
            <>
              <p className="text-xs text-text-muted leading-relaxed">
                把这个地址添加到日历 App（Google Calendar →「通过网址添加」；
                Apple 日历 →「文件 → 新建日历订阅」）。订阅后活动会自动同步。
                <br />
                该地址含公会级密钥，<strong className="text-text-secondary">请勿公开分享</strong>。
              </p>

              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={httpsUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 px-3 py-2 text-xs font-mono bg-bg-secondary border border-border-default rounded text-text-secondary focus:border-wow-gold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copy}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-border-default text-text-secondary rounded hover:border-wow-gold hover:text-wow-gold transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "已复制" : "复制"}
                </button>
              </div>

              {webcalUrl && (
                <p className="text-xs text-text-muted">
                  Apple 设备可直接用：
                  <span className="font-mono break-all text-text-secondary"> {webcalUrl}</span>
                </p>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={rotate}
                  disabled={rotating}
                  className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-wow-red transition-colors disabled:opacity-50"
                >
                  {rotating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  轮换密钥（旧链接失效）
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-wow-red">获取订阅地址失败</p>
          )}
        </div>
      )}
    </div>
  );
}
