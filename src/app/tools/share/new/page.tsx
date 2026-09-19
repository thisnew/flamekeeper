"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft, Upload, FileText, Loader2, X, Paperclip, AlertCircle, Send,
} from "lucide-react";
import toast from "react-hot-toast";

const MAX_SIZE = 10 * 1024 * 1024;

const ROLE_OK = ["ADMIN", "OFFICER", "MEMBER"];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function NewSharePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const canPublish = status === "authenticated" && ROLE_OK.includes(user?.role);

  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    tags: "",
    content: "",
  });
  const [attachment, setAttachment] = useState<{ url: string; name: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > MAX_SIZE) {
      toast.error(`文件过大（${formatSize(file.size)}），上限 10MB`);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setAttachment({ url: data.url, name: data.name, size: data.size });
        toast.success("附件上传成功");
      } else {
        toast.error(data.error || "上传失败");
      }
    } catch {
      toast.error("上传失败，请稍后重试");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!form.title.trim()) return toast.error("请填写标题");
    if (!form.content.trim()) return toast.error("请填写内容");
    setSubmitting(true);
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          attachmentUrl: attachment?.url,
          attachmentName: attachment?.name,
          attachmentSize: attachment?.size,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("发布成功！");
        router.push(`/tools/share/${data.share.slug}`);
        router.refresh();
      } else {
        toast.error(data.error || "发布失败");
      }
    } catch {
      toast.error("发布失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-wow-gold" />
      </div>
    );
  }

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/tools" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-wow-gold mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回工具分享
      </Link>

      <h1 className="font-display text-2xl font-bold text-wow-gold text-glow mb-2">发布分享</h1>
      <p className="text-sm text-text-muted mb-8">分享你的工具、宏、配置或攻略</p>

      {!canPublish ? (
        <div className="bg-bg-card border border-wow-orange/30 rounded p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-wow-orange shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-text-primary mb-1">需要公会成员权限</h3>
            <p className="text-sm text-text-muted">
              仅审批通过的公会成员可以发布分享。请联系官员完成入会审批。
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-bg-card border border-border-default rounded p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">标题 *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="例如：团本必备宏合集"
              className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">摘要（可选）</label>
            <input
              type="text"
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="一句话描述"
              className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">标签（可选，逗号分隔）</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="宏, 团本, 输出"
              className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none"
            />
          </div>

          {/* Attachment */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              附件（可选，≤ 10MB）
            </label>
            {attachment ? (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-bg-secondary border border-border-gold rounded">
                <span className="flex items-center gap-2 text-sm text-text-primary min-w-0">
                  <Paperclip className="w-4 h-4 text-wow-gold shrink-0" />
                  <span className="truncate">{attachment.name}</span>
                  <span className="text-xs text-text-muted shrink-0">({formatSize(attachment.size)})</span>
                </span>
                <button
                  onClick={() => setAttachment(null)}
                  className="p-1 text-text-muted hover:text-wow-red shrink-0"
                  title="移除附件"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 px-4 py-6 bg-bg-secondary border border-dashed border-border-default rounded cursor-pointer hover:border-border-gold transition-colors">
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-wow-gold" />
                    <span className="text-sm text-text-muted">上传中...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-text-muted" />
                    <span className="text-sm text-text-muted">点击选择文件（zip / 文本 / 图片 / 文档，≤10MB）</span>
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">内容 * （支持 Markdown）</label>
            <textarea
              rows={12}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder={"## 说明\n\n在这里写下分享内容...\n\n- 要点一\n- 要点二"}
              className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none font-mono text-sm resize-y"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={submit}
              disabled={submitting || uploading}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              发布
            </button>
            <Link
              href="/tools"
              className="px-6 py-2.5 border border-border-default text-text-muted rounded hover:text-text-primary transition-colors"
            >
              取消
            </Link>
          </div>

          <p className="text-xs text-text-muted flex items-center gap-1 pt-2 border-t border-border-default">
            <FileText className="w-3 h-3" />
            发布者：{user?.name || user?.email}
          </p>
        </div>
      )}
    </div>
  );
}