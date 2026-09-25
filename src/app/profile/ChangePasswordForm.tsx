"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

/**
 * 「修改密码」表单。
 *
 * 抽成独立客户端组件，是为了让 `/profile` 能当**服务端组件**渲染 ——
 * 页面数据由服务端直接查库后作为 props 传给 WtfManager，
 * 子组件里的 `router.refresh()` 才真正能刷新到数据。
 */
export default function ChangePasswordForm() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!form.currentPassword || !form.newPassword) return toast.error("请填写完整");
    if (form.newPassword !== form.confirm) return toast.error("两次新密码不一致");
    if (form.newPassword.length < 6) return toast.error("新密码至少 6 位");

    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("密码已更新");
        setForm({ currentPassword: "", newPassword: "", confirm: "" });
      } else {
        toast.error(data.error || "修改失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none";

  return (
    <div className="bg-bg-card border border-border-default rounded p-6">
      <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-wow-gold" /> 修改密码
      </h3>
      <div className="space-y-3 max-w-md">
        <input
          type="password"
          autoComplete="current-password"
          placeholder="当前密码"
          value={form.currentPassword}
          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          className={inputCls}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="新密码（至少 6 位）"
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          className={inputCls}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="确认新密码"
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          className={inputCls}
        />
        <button
          onClick={submit}
          disabled={busy}
          className="px-4 py-2 bg-wow-gold text-black font-bold text-sm rounded hover:bg-wow-gold-bright disabled:opacity-50 flex items-center gap-1"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}更新密码
        </button>
      </div>
    </div>
  );
}
