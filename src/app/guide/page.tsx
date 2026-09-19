import { Metadata } from "next";
import { Shield, Swords, Star, Flame, ArrowRight, CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "入会指南",
  description: "了解如何加入 Eternal Flame 公会。注册账号、提交入会申请、等待审核，薪火不灭，荣耀永燃。",
};

const steps = [
  {
    icon: Flame,
    title: "注册账号",
    desc: "填写邮箱、密码及角色信息，创建你的守焰者身份。",
  },
  {
    icon: CheckCircle,
    title: "验证邮箱",
    desc: "前往邮箱点击验证链接，确认你的身份。",
  },
  {
    icon: Star,
    title: "提交审批",
    desc: "登录后完善角色资料，提交入会审批申请。",
  },
  {
    icon: Clock,
    title: "等待审核",
    desc: "官员将在 24-48 小时内审核你的申请，请耐心等待。",
  },
  {
    icon: Shield,
    title: "审批通过",
    desc: "审核通过后，你的账号将升级为公会成员，解锁全部功能。",
  },
  {
    icon: Swords,
    title: "加入交流",
    desc: "加入 KOOK 频道和微信群，与公会成员一起冒险。",
  },
];

const statuses = [
  { icon: Clock, label: "待邮箱验证", desc: "请前往邮箱点击验证链接", color: "text-wow-grey" },
  { icon: Clock, label: "待审批", desc: "申请已提交，等待官员审核", color: "text-wow-gold" },
  { icon: CheckCircle, label: "已通过", desc: "恭喜！你已成为公会成员", color: "text-wow-green" },
  { icon: XCircle, label: "已拒绝", desc: "申请未通过，可重新提交", color: "text-wow-red" },
  { icon: AlertTriangle, label: "需补充信息", desc: "请根据官员提示补充资料", color: "text-wow-orange" },
];

export default function GuidePage() {
  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="py-16 border-b border-border-default bg-gradient-to-b from-bg-secondary/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Shield className="w-12 h-12 text-wow-gold mx-auto mb-4" />
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-wow-gold text-glow mb-4">
            入会指南
          </h1>
          <p className="text-text-secondary max-w-2xl mx-auto">
            欢迎来到 Eternal Flame。以下是你加入公会的完整流程说明。
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-wow-gold mb-10 text-center">
            入会流程
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="relative bg-bg-card border border-border-default rounded p-6 wow-corner">
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-wow-gold text-black rounded-full flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <step.icon className="w-8 h-8 text-wow-gold mb-3 mt-2" />
                <h3 className="font-bold text-text-primary mb-2">{step.title}</h3>
                <p className="text-sm text-text-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Status Guide */}
      <section className="py-16 bg-bg-secondary/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-wow-gold mb-10 text-center">
            审批状态说明
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {statuses.map((s, i) => (
              <div key={i} className="bg-bg-card border border-border-default rounded p-4 text-center">
                <s.icon className={`w-8 h-8 ${s.color} mx-auto mb-2`} />
                <div className={`font-bold text-sm ${s.color}`}>{s.label}</div>
                <div className="text-xs text-text-muted mt-1">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recruitment */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-wow-gold mb-8 text-center">
            招募要求
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-bg-card border border-border-default rounded p-6">
              <h3 className="font-bold text-wow-gold mb-4 text-lg">📋 基本要求</h3>
              <ul className="space-y-3 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-wow-green mt-0.5 shrink-0" />
                  <span>拥有正式魔兽世界账号，当前版本活跃玩家</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-wow-green mt-0.5 shrink-0" />
                  <span>能够使用 KOOK 进行语音交流（听即可，说不强制）</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-wow-green mt-0.5 shrink-0" />
                  <span>遵守公会规则，尊重队友，积极参与团队活动</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-wow-green mt-0.5 shrink-0" />
                  <span>保持稳定的出勤率（团本成员需保证 75%+）</span>
                </li>
              </ul>
            </div>

            <div className="bg-bg-card border border-border-default rounded p-6">
              <h3 className="font-bold text-wow-gold mb-4 text-lg">🎯 需求职业</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { role: "坦克", classes: "防护战士、血DK", status: "低需求", color: "text-wow-green" },
                  { role: "治疗", classes: "恢复萨满、神圣牧师", status: "中等需求", color: "text-wow-gold" },
                  { role: "近战DPS", classes: "狂徒贼、惩戒骑", status: "高需求", color: "text-wow-red" },
                  { role: "远程DPS", classes: "毁灭术、奥法", status: "中等需求", color: "text-wow-gold" },
                ].map((item, i) => (
                  <div key={i} className="bg-bg-secondary/50 rounded p-3">
                    <div className="font-bold text-text-primary text-xs">{item.role}</div>
                    <div className="text-xs text-text-muted mt-1">{item.classes}</div>
                    <div className={`text-xs ${item.color} mt-1`}>{item.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-bg-secondary/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-wow-gold mb-10 text-center">
            常见问题
          </h2>
          <div className="space-y-4">
            {[
              { q: "入会需要什么条件？", a: "拥有当前版本魔兽世界正式账号，能够上 KOOK 语音（听即可），保持稳定出勤。" },
              { q: "审核需要多长时间？", a: "通常在 24-48 小时内完成审核。如果超过 48 小时未收到结果，请联系官员。" },
              { q: "没有 Raid 经验可以申请吗？", a: "当然可以！我们欢迎各个层次的玩家。入会申请中如实填写即可。" },
              { q: "如何加入微信群？", a: "审批通过后，官员会发送微信群二维码或邀请链接。也可通过 KOOK 频道获取。" },
              { q: "账号审批可以重新提交吗？", a: "如果被拒绝，你可以根据官员的反馈修改资料后重新提交申请。" },
            ].map((faq, i) => (
              <details key={i} className="group bg-bg-card border border-border-default rounded">
                <summary className="px-6 py-4 cursor-pointer font-bold text-text-primary group-open:text-wow-gold transition-colors select-none">
                  {faq.q}
                </summary>
                <div className="px-6 pb-4 text-sm text-text-secondary leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="max-w-xl mx-auto px-4">
          <Flame className="w-10 h-10 text-wow-orange mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold text-wow-gold mb-4">准备好了吗？</h2>
          <p className="text-text-secondary mb-6">
            点击下方按钮，开始你的入会之旅。艾泽拉斯在等待！
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-8 py-3 bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright transition-all"
          >
            现在注册
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}