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

      {/* CTA — at the very end of the membership process */}
      <section className="py-16 text-center">
        <div className="max-w-xl mx-auto px-4">
          <Flame className="w-10 h-10 text-wow-orange mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold text-wow-gold mb-4">准备好了吗？</h2>
          <p className="text-text-secondary mb-6">
            点击下方按钮，开始你的入会之旅。艾泽拉斯在等待！
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-8 py-3 bg-wow-gold text-black font-bold rounded hover:bg-wow-gold-bright transition-all shadow-gold"
          >
            现在注册
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-text-muted mt-4">
            已是公会成员？<Link href="/auth/login" className="text-wow-gold hover:underline">前往登录</Link>
          </p>
        </div>
      </section>
    </div>
  );
}