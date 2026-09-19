"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Save, Plug, Mail, CheckCircle, XCircle, Send } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Settings {
  site_title: string;
  site_description: string;
  guild_name: string;
  guild_chinese_name: string;
  guild_server: string;
  guild_faction: string;
  kook_invite_url: string;
  wechat_qr_image: string;
  recruitment_status: string;
  officer_emails: string;
  mail_enabled: string;
  smtp_host: string;
  smtp_port: string;
  smtp_secure: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from_name: string;
}

export default function SettingsClient({ initial }: { initial: Settings }) {
  const [form, setForm] = useState<Settings>(initial);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState(initial.smtp_user || "");
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) toast.success("设置已保存");
      else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "保存失败");
      }
    } finally {
      setBusy(false);
    }
  };

  const testMail = async (withMail: boolean) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", to: withMail && testTo ? testTo : undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ ok: true, msg: data.message || "连接正常" });
        toast.success(data.message || "连接正常");
      } else {
        setTestResult({ ok: false, msg: data.error || "测试失败" });
        toast.error(data.error || "测试失败");
      }
    } catch {
      setTestResult({ ok: false, msg: "网络错误" });
    } finally {
      setTesting(false);
    }
  };

  const generalFields: Array<{ key: keyof Settings; label: string; placeholder: string; type?: string; help?: string }> = [
    { key: "site_title", label: "网站标题", placeholder: "Eternal Flame | 守焰者" },
    { key: "site_description", label: "网站描述", placeholder: "薪火不灭，荣耀永燃" },
    { key: "guild_name", label: "公会英文名", placeholder: "Eternal Flame" },
    { key: "guild_chinese_name", label: "公会中文名", placeholder: "守焰者" },
    { key: "guild_server", label: "服务器", placeholder: "燃烧之刃" },
    { key: "guild_faction", label: "阵营", placeholder: "Alliance / Horde" },
    { key: "kook_invite_url", label: "KOOK 邀请链接", placeholder: "https://kook.top/...", type: "url" },
    { key: "wechat_qr_image", label: "微信群二维码 URL", placeholder: "https://...", type: "url", help: "上传到图床后粘贴链接" },
    { key: "officer_emails", label: "官员邮箱", placeholder: "flamekeeper_admin@163.com,officer2@..." },
  ];

  const set = (k: keyof Settings, v: string) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      {/* General */}
      <div className="bg-bg-card border border-border-default rounded p-6 space-y-4">
        <h3 className="font-display text-lg font-bold text-wow-gold">站点信息</h3>
        {generalFields.map((f) => (
          <div key={f.key}>
            <label className="block text-sm text-text-secondary mb-1.5">{f.label}</label>
            <input
              type={f.type || "text"}
              value={form[f.key] || ""}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none"
            />
            {f.help && <p className="text-xs text-text-muted mt-1">{f.help}</p>}
          </div>
        ))}
        <div>
          <label className="block text-sm text-text-secondary mb-1.5">招募状态</label>
          <select
            value={form.recruitment_status}
            onChange={(e) => set("recruitment_status", e.target.value)}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none"
          >
            <option value="招募中">招募中</option>
            <option value="暂满">暂满</option>
            <option value="暂停招募">暂停招募</option>
          </select>
        </div>
      </div>

      {/* Mail / SMTP */}
      <div className="bg-bg-card border border-border-default rounded p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-wow-gold flex items-center gap-2">
            <Mail className="w-5 h-5" /> 邮件服务（SMTP 发信）
          </h3>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={form.mail_enabled === "true"}
              onChange={(e) => set("mail_enabled", e.target.checked ? "true" : "false")}
              className="accent-wow-gold"
            />
            启用邮件
          </label>
        </div>

        <p className="text-xs text-text-muted">
          用于发送注册验证邮件与会员群发通知。163 邮箱请使用<b className="text-wow-gold">授权码</b>而非登录密码。
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">SMTP 主机</label>
            <input
              value={form.smtp_host}
              onChange={(e) => set("smtp_host", e.target.value)}
              placeholder="smtp.163.com"
              className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">端口</label>
            <input
              value={form.smtp_port}
              onChange={(e) => set("smtp_port", e.target.value)}
              placeholder="465"
              className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">发信账号</label>
            <input
              value={form.smtp_user}
              onChange={(e) => set("smtp_user", e.target.value)}
              placeholder="flamekeeper_admin@163.com"
              className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">密码 / 授权码</label>
            <input
              type="password"
              value={form.smtp_pass}
              onChange={(e) => set("smtp_pass", e.target.value)}
              placeholder="留空/保持 ******** 则不改动"
              className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">发件人显示名</label>
            <input
              value={form.smtp_from_name}
              onChange={(e) => set("smtp_from_name", e.target.value)}
              placeholder="Eternal Flame 守焰者"
              className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">加密方式</label>
            <select
              value={form.smtp_secure}
              onChange={(e) => set("smtp_secure", e.target.value)}
              className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none"
            >
              <option value="true">SSL/TLS（465 端口）</option>
              <option value="false">STARTTLS（587 / 25 端口）</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-default">
          <button
            onClick={() => testMail(false)}
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
            onClick={() => testMail(true)}
            disabled={testing || !testTo}
            className="flex items-center gap-1.5 px-4 py-2 bg-wow-gold text-black text-sm font-bold rounded hover:bg-wow-gold-bright disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            发送测试邮件
          </button>
        </div>

        <p className="text-xs text-text-muted">
          测试前请先<b className="text-wow-gold">保存设置</b>，测试使用已保存的配置。
          群发入口见 <Link href="/admin/mail" className="text-wow-gold hover:underline">邮件群发</Link>。
        </p>

        {testResult && (
          <div
            className={cn(
              "p-3 rounded text-sm flex items-start gap-2 border",
              testResult.ok
                ? "bg-wow-green/10 border-wow-green/30 text-wow-green"
                : "bg-wow-red/10 border-wow-red/30 text-wow-red"
            )}
          >
            {testResult.ok ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <XCircle className="w-4 h-4 mt-0.5" />}
            <span className="break-all">{testResult.msg}</span>
          </div>
        )}
      </div>

      <button
        onClick={save}
        disabled={busy}
        className="flex items-center gap-1 px-6 py-2.5 bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        保存设置
      </button>

      <div className="bg-wow-red/5 border border-wow-red/20 rounded p-4">
        <h4 className="font-bold text-wow-red mb-2 text-sm">⚠ 安全提醒</h4>
        <ul className="text-xs text-text-secondary space-y-1">
          <li>· 生产环境请使用环境变量 <code className="text-wow-gold">AUTH_SECRET</code> 替代默认值</li>
          <li>· SMTP 密码以明文保存在数据库中，请勿与生产库共用邮箱密码，建议使用邮箱<b className="text-wow-gold">授权码</b></li>
          <li>· 定期备份 <code className="text-wow-gold">data/prod.db</code> 与 <code className="text-wow-gold">public/uploads</code></li>
          <li>· 初始管理员账号请登录后立即修改密码</li>
        </ul>
      </div>
    </div>
  );
}