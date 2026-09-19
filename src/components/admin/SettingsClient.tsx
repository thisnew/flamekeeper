"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Save } from "lucide-react";

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
}

export default function SettingsClient({ initial }: { initial: Settings }) {
  const [form, setForm] = useState<Settings>(initial);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) toast.success("设置已保存");
      else toast.error("保存失败");
    } finally {
      setBusy(false);
    }
  };

  const fields: Array<{ key: keyof Settings; label: string; placeholder: string; type?: string; help?: string }> = [
    { key: "site_title", label: "网站标题", placeholder: "Eternal Flame | 守焰者" },
    { key: "site_description", label: "网站描述", placeholder: "薪火不灭，荣耀永燃" },
    { key: "guild_name", label: "公会英文名", placeholder: "Eternal Flame" },
    { key: "guild_chinese_name", label: "公会中文名", placeholder: "守焰者" },
    { key: "guild_server", label: "服务器", placeholder: "燃烧之刃" },
    { key: "guild_faction", label: "阵营", placeholder: "Alliance / Horde" },
    { key: "kook_invite_url", label: "KOOK 邀请链接", placeholder: "https://kook.top/...", type: "url" },
    { key: "wechat_qr_image", label: "微信群二维码 URL", placeholder: "https://...", type: "url", help: "上传到图床后粘贴链接" },
    { key: "officer_emails", label: "官员邮箱", placeholder: "admin@eternalflame.gg,officer2@..." },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-bg-card border border-border-default rounded p-6 space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-sm text-text-secondary mb-1.5">{f.label}</label>
            <input
              type={f.type || "text"}
              value={form[f.key] || ""}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
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
            onChange={(e) => setForm({ ...form, recruitment_status: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none"
          >
            <option value="招募中">招募中</option>
            <option value="暂满">暂满</option>
            <option value="暂停招募">暂停招募</option>
          </select>
        </div>
        <button onClick={save} disabled={busy} className="flex items-center gap-1 px-6 py-2.5 bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          保存设置
        </button>
      </div>

      <div className="bg-wow-red/5 border border-wow-red/20 rounded p-4">
        <h4 className="font-bold text-wow-red mb-2 text-sm">⚠ 安全提醒</h4>
        <ul className="text-xs text-text-secondary space-y-1">
          <li>· 生产环境请使用环境变量 <code className="text-wow-gold">AUTH_SECRET</code> 替代默认值</li>
          <li>· 定期备份 <code className="text-wow-gold">data/prod.db</code> 或切换到 PostgreSQL</li>
          <li>· 默认 admin 账号密码为 admin123，请登录后立即修改</li>
        </ul>
      </div>
    </div>
  );
}