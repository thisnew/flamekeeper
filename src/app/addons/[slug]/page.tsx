"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, CheckCircle, Download, ExternalLink, Loader2, Puzzle } from "lucide-react";
import toast from "react-hot-toast";

interface Addon {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  applicableClass: string | null;
  gameVersion: string | null;
  downloadUrl: string | null;
  waString: string | null;
  tutorialContent: string | null;
  screenshotUrl: string | null;
  isRecommended: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  RAID: "团本", MPLUS: "大秘境", PVP: "PVP", UI: "界面美化",
  CLASS: "职业专精", WEAKAURA: "WeakAuras", MACRO: "宏命令", TOOL: "工具",
};

export default function AddonDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [addon, setAddon] = useState<Addon | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/addons")
      .then((r) => r.json())
      .then((d) => {
        const found = (d.addons || []).find((a: Addon) => a.slug === slug);
        setAddon(found || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const copyWA = async () => {
    if (!addon?.waString) return;
    try {
      await navigator.clipboard.writeText(addon.waString);
      setCopied(true);
      toast.success("WeakAuras 字符串已复制");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-wow-gold" />
      </div>
    );
  }

  if (!addon) {
    return (
      <div className="page-enter max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
        <Puzzle className="w-12 h-12 mx-auto mb-4 text-text-muted opacity-50" />
        <p className="text-text-muted mb-4">插件未找到</p>
        <Link href="/addons" className="text-wow-gold hover:underline">返回插件库</Link>
      </div>
    );
  }

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/addons" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-wow-gold mb-8">
        <ArrowLeft className="w-4 h-4" /> 返回插件库
      </Link>

      <div className="bg-bg-card border border-border-default rounded p-8 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs px-2 py-0.5 bg-wow-gold/10 text-wow-gold border border-border-gold rounded">
              {CATEGORY_LABELS[addon.category] || addon.category}
            </span>
            {addon.isRecommended && (
              <span className="text-xs px-2 py-0.5 bg-wow-orange/10 text-wow-orange border border-wow-orange/30 rounded">推荐</span>
            )}
            {addon.gameVersion && (
              <span className="text-xs px-2 py-0.5 bg-bg-secondary text-text-muted rounded">版本 {addon.gameVersion}</span>
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-wow-gold text-glow mb-3">{addon.name}</h1>
          <p className="text-text-secondary leading-relaxed">{addon.description}</p>
        </div>

        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-border-default">
          {addon.downloadUrl && (
            <a href={addon.downloadUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-wow-blue/20 text-wow-blue-light border border-wow-blue/40 rounded hover:bg-wow-blue/30 transition-colors">
              <Download className="w-4 h-4" /> 下载
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {addon.waString && (
            <button onClick={copyWA}
              className="flex items-center gap-1.5 px-4 py-2 bg-wow-purple/20 text-wow-purple border border-wow-purple/40 rounded hover:bg-wow-purple/30 transition-colors">
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "已复制" : "复制 WA 字符串"}
            </button>
          )}
        </div>
      </div>

      {addon.waString && (
        <div className="bg-bg-card border border-border-default rounded p-6 mb-6">
          <h3 className="font-display text-lg font-bold text-wow-gold mb-3">WeakAuras 字符串</h3>
          <div className="bg-bg-secondary rounded p-4 font-mono text-xs text-text-muted break-all max-h-48 overflow-y-auto">
            {addon.waString}
          </div>
          <p className="text-xs text-text-muted mt-2">在 WeakAuras 插件中点击「Import」粘贴即可导入。</p>
        </div>
      )}

      {addon.tutorialContent && (
        <div className="bg-bg-card border border-border-default rounded p-6">
          <h3 className="font-display text-lg font-bold text-wow-gold mb-4">配置教程</h3>
          <div className="prose prose-invert max-w-none text-text-secondary leading-relaxed">
            {addon.tutorialContent.split("\n").map((line, i) => {
              if (line.startsWith("## ")) return <h2 key={i} className="font-display text-xl font-bold text-wow-gold mt-6 mb-3">{line.slice(3)}</h2>;
              if (line.startsWith("### ")) return <h3 key={i} className="font-bold text-lg text-text-primary mt-4 mb-2">{line.slice(4)}</h3>;
              if (line.trim() === "") return <br key={i} />;
              return <p key={i} className="mb-2">{line}</p>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
