"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  Mail, Send, Loader2, CheckCircle, XCircle, Plug, Users, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Counts {
  USER: number;
  MEMBER: number;
  OFFICER: number;
  ADMIN: number;
  verified: number;
}

const ROLE_OPTIONS = [
  { value: "USER", label: "注册用户（待审批）" },
  { value: "MEMBER", label: "公会成员" },
  { value: "OFFICER", label: "官员" },
  { value: "ADMIN", label: "管理员" },
] as const;

export default function MailClient({
  configured,
  smtpUser,
  counts,
}: {
  configured: boolean;
  smtpUser: string;
  counts: Counts;
}) {
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState(smtpUser || "");
  const [connResult, setConnResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [roles, setRoles] = useState<string[]>(["MEMBER"]);
  const [onlyVerified, setOnlyVerified] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  const toggleRole = (r: string) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const recipientCount = roles.reduce((sum, r) => sum + (counts as any)[r] || 0, 0);

  const testConnection = async (withMail: boolean) => {
    setTesting(true);
    setConnResult(null);
    try {
      const res = await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", to: withMail && testTo ? testTo : undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setConnResult({ ok: true, msg: data.message || "连接正常" });
        toast.success(data.message || "连接正常");
      } else {
        setConnResult({ ok: false, msg: data.error || "连接失败" });
        toast.error(data.error || "连接失败");
      }
    } catch {
      setConnResult({ ok: false, msg: "网络错误" });
    } finally {
      setTesting(false);
    }
  };

  const send = async () => {
    if (!subject.trim()) return toast.error("请填写邮件主题");
    if (!content.trim()) return toast.error("请填写邮件正文");
    if (roles.length === 0) return toast.error("请至少选择一个收件人群组");
    if (!confirm(`确认向约 ${recipientCount} 位用户群发该邮件？`)) return;

    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", subject, content, roles, onlyVerified }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        toast.success(data.message || "群发完成");
      } else {
        toast.error(data.error || "群发失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SMTP status */}
      <div className="bg-bg-card border border-border-default rounded p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="font-display text-lg font-bold text-wow-gold flex items-center gap-2">
            <Plug className="w-5 h-5" /> SMTP 发信配置
          </h3>
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded border",
              configured
                ? "bg-wow-green/10 text-wow-green border-wow-green/30"
                : "bg-wow-red/10 text-wow-red border-wow-red/30"
            )}
          >
            {configured ? "已配置" : "未配置"}
          </span>
        </div>

        <p className="text-sm text-text-muted mb-4">
          发信账号：<code className="text-wow-gold">{smtpUser || "未设置"}</code>
          <br />
          修改 SMTP 参数请前往 <a href="/admin/settings" className="text-wow-gold hover:underline">系统设置</a>。
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => testConnection(false)}
            disabled={testing}
            className="flex items-center gap-1.5 px-4 py-2 border border-border-gold text-wow-gold text-sm rounded hover:bg-wow-gold/10 disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
            测试连接
          </button>
          <input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="测试收件邮箱"
            className="px-3 py-2 bg-bg-secondary border border-border-default rounded text-sm text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none"
          />
          <button
            onClick={() => testConnection(true)}
            disabled={testing || !testTo}
            className="flex items-center gap-1.5 px-4 py-2 bg-wow-gold text-black text-sm font-bold rounded hover:bg-wow-gold-bright disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            发送测试邮件
          </button>
        </div>

        {connResult && (
          <div
            className={cn(
              "mt-4 p-3 rounded text-sm flex items-start gap-2 border",
              connResult.ok
                ? "bg-wow-green/10 border-wow-green/30 text-wow-green"
                : "bg-wow-red/10 border-wow-red/30 text-wow-red"
            )}
          >
            {connResult.ok ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <XCircle className="w-4 h-4 mt-0.5" />}
            <span className="break-all">{connResult.msg}</span>
          </div>
        )}
      </div>

      {/* Bulk send */}
      <div className="bg-bg-card border border-border-default rounded p-6">
        <h3 className="font-display text-lg font-bold text-wow-gold flex items-center gap-2 mb-4">
          <Send className="w-5 h-5" /> 会员群发
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">邮件主题 *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="例如：本周团本安排"
              className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">正文 * （纯文本，自动套用公会模板）</label>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"各位公会成员：\n\n本周四 20:00 团本开荒，请提前准备..."}
              className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none text-sm resize-y"
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4" /> 收件人群组 *
            </label>
            <div className="grid sm:grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors text-sm",
                    roles.includes(opt.value)
                      ? "border-border-gold bg-wow-gold/10 text-wow-gold"
                      : "border-border-default text-text-muted hover:border-border-gold/50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={roles.includes(opt.value)}
                    onChange={() => toggleRole(opt.value)}
                    className="accent-wow-gold"
                  />
                  <span className="flex-1">{opt.label}</span>
                  <span className="text-xs opacity-70">{(counts as any)[opt.value]}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={onlyVerified}
              onChange={(e) => setOnlyVerified(e.target.checked)}
              className="accent-wow-gold"
            />
            仅发送给已验证邮箱的账号（推荐）
          </label>

          <div className="flex items-center gap-3 pt-2 border-t border-border-default">
            <button
              onClick={send}
              disabled={sending || !configured}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              群发（约 {recipientCount} 人）
            </button>
            {!configured && (
              <span className="text-xs text-wow-red flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> 请先在系统设置中配置 SMTP
              </span>
            )}
          </div>
        </div>

        {result && (
          <div className="mt-5 p-4 rounded border border-border-gold bg-bg-secondary/50 text-sm">
            <div className="font-bold text-wow-gold mb-2">发送结果</div>
            <div className="text-text-secondary">
              共 {result.total} 人 · 成功 <span className="text-wow-green">{result.sent}</span>
              {result.failed > 0 && (
                <> · 失败 <span className="text-wow-red">{result.failed}</span></>
              )}
            </div>
            {result.failures?.length > 0 && (
              <ul className="mt-2 text-xs text-wow-red space-y-0.5">
                {result.failures.map((f: any, i: number) => (
                  <li key={i}>
                    {f.email} — {f.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}