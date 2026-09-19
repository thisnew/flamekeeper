"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Flame, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { WOW_CLASSES, WOW_SERVERS } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    nickname: "",
    characterName: "",
    server: "",
    faction: "Alliance" as "Alliance" | "Horde",
    class: "",
    spec: "",
    itemLevel: "",
    raidExperience: "",
    playableTimes: "",
    kookId: "",
    wechatId: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("两次密码输入不一致");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("注册成功！请等待官员审核。");
        router.push("/auth/login");
      } else {
        toast.error(data.error || "注册失败");
      }
    } catch {
      toast.error("网络错误，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-wow-gold mb-6">
          <ArrowLeft className="w-4 h-4" /> 返回首页
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bg-card border-2 border-wow-gold shadow-gold mb-4">
            <Flame className="w-8 h-8 text-wow-orange" />
          </div>
          <h1 className="font-display text-2xl font-bold text-wow-gold text-glow">加入 Eternal Flame</h1>
          <p className="text-sm text-text-muted mt-2">注册账号，提交入会申请</p>
        </div>

        <div className="bg-bg-card border border-border-default rounded p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account */}
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">邮箱 *</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required
                className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">密码 *</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} required minLength={6}
                    className="w-full px-4 py-2.5 pr-10 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">确认密码 *</label>
                <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required minLength={6}
                  className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
              </div>
            </div>

            <hr className="border-border-default" />

            {/* Nickname & Character */}
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">
                昵称 * <span className="text-xs text-text-muted">（社区称呼，如「老火焰」「艾泽拉斯之子」）</span>
              </label>
              <input type="text" name="nickname" value={form.nickname} onChange={handleChange} required minLength={2} maxLength={20}
                className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none"
                placeholder="2-20个字符" />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">角色名 * <span className="text-xs text-text-muted">（游戏内角色名）</span></label>
              <input type="text" name="characterName" value={form.characterName} onChange={handleChange} required minLength={2} maxLength={12}
                className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">服务器 *</label>
                <select name="server" value={form.server} onChange={handleChange} required
                  className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none">
                  <option value="">选择服务器</option>
                  {WOW_SERVERS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">阵营 *</label>
                <div className="flex gap-2">
                  <label className={`flex-1 py-2.5 text-center text-sm rounded border cursor-pointer transition-colors ${
                    form.faction === "Alliance" ? "bg-wow-blue/20 border-wow-blue text-wow-blue-light" : "border-border-default text-text-muted"
                  }`}>
                    <input type="radio" name="faction" value="Alliance" checked={form.faction === "Alliance"} onChange={handleChange} className="hidden" />
                    联盟
                  </label>
                  <label className={`flex-1 py-2.5 text-center text-sm rounded border cursor-pointer transition-colors ${
                    form.faction === "Horde" ? "bg-wow-red/20 border-wow-red text-wow-red" : "border-border-default text-text-muted"
                  }`}>
                    <input type="radio" name="faction" value="Horde" checked={form.faction === "Horde"} onChange={handleChange} className="hidden" />
                    部落
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">职业 *</label>
                <select name="class" value={form.class} onChange={handleChange} required
                  className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none">
                  <option value="">选择职业</option>
                  {WOW_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">专精 *</label>
                <input type="text" name="spec" value={form.spec} onChange={handleChange} required
                  className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none"
                  placeholder="如：防护、神圣" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">当前装等（可选）</label>
              <input type="number" name="itemLevel" value={form.itemLevel} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Raid 经验（可选）</label>
              <textarea name="raidExperience" value={form.raidExperience} onChange={handleChange} rows={2}
                className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary placeholder-text-muted focus:border-wow-gold focus:outline-none resize-none"
                placeholder="简述你的 Raid 经验" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">可活动时间（可选）</label>
                <input type="text" name="playableTimes" value={form.playableTimes} onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none"
                  placeholder="如：周一至周五 19:00-23:00" />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">KOOK ID（可选）</label>
                <input type="text" name="kookId" value={form.kookId} onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">微信号（可选）</label>
              <input type="text" name="wechatId" value={form.wechatId} onChange={handleChange}
                className="w-full px-4 py-2.5 bg-bg-secondary border border-border-default rounded text-text-primary focus:border-wow-gold focus:outline-none" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "提交中..." : "提交入会申请"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-text-muted mt-6">
          已有账号？{" "}
          <Link href="/auth/login" className="text-wow-gold hover:underline">登录</Link>
        </p>
      </div>
    </div>
  );
}