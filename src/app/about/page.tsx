import { Metadata } from "next";
import { Shield, Flame, Swords, Crown, MapPin, Calendar, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";

import { displayName } from "@/lib/privacy";
export const metadata: Metadata = {
  title: "公会介绍",
  description: "了解 Eternal Flame 公会的历史、理念、管理层与团队成就。薪火不灭，荣耀永燃。",
};

/**
 * 四个会阶 + 当前持有者。
 *
 * 会阶（公会内部身份）与系统权限（能不能进后台）是两个维度：
 * 管理员 ≠ 会长。详见 lib/guild-rank.ts。
 */
const RANK_ROWS = [
  { rank: "LEADER", label: "会长", desc: "公会总负责人，战略决策与外交", icon: Crown },
  { rank: "RAID_LEADER", label: "团长", desc: "团队副本战术制定与现场指挥", icon: Swords },
  { rank: "CORE", label: "核心", desc: "稳定出勤、带动团队氛围的骨干", icon: Shield },
  { rank: "MEMBER", label: "成员", desc: "公会正式成员", icon: Users },
];

async function getRankHolders() {
  try {
    const users = await prisma.user.findMany({
      where: { status: "APPROVED" },
      select: { name: true, email: true, guildRank: true },
      orderBy: { createdAt: "asc" },
    });
    const map: Record<string, string[]> = {};
    for (const u of users) {
      const key = u.guildRank || "MEMBER";
      // 他人邮箱要遮蔽中间段 —— 这是公开页面
      (map[key] ||= []).push(displayName(u));
    }
    return map;
  } catch {
    return {} as Record<string, string[]>;
  }
}

export default async function AboutPage() {
  const holders = await getRankHolders();

  return (
    <div className="page-enter">
      <section className="py-16 border-b border-border-default bg-gradient-to-b from-bg-secondary/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Shield className="w-12 h-12 text-wow-gold mx-auto mb-4" />
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-wow-gold text-glow mb-4">
            公会介绍
          </h1>
          <p className="text-text-secondary max-w-2xl mx-auto">
            薪火不灭，荣耀永燃。了解 Eternal Flame 的故事。
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-bg-card border border-border-default rounded p-8 mb-8">
            <Flame className="w-10 h-10 text-wow-orange mb-4" />
            <h2 className="font-display text-2xl font-bold text-wow-gold mb-4">我们的故事</h2>
            <div className="prose prose-invert max-w-none text-text-secondary space-y-4 text-sm leading-relaxed">
              <p>
                Eternal Flame（守焰者）是一支以团队副本为核心、注重成员成长的魔兽世界公会。
                我们相信，每一团火焰都值得被守护——无论是开荒时的激情，还是Farm时的默契。
              </p>
              <p>
                公会成立于魔兽世界国服回归之际，由一群热爱团队副本的玩家组建。
                我们的核心团队成员拥有多年 Raid 经验，覆盖从经典旧世到当前版本的各个阶段。
              </p>
              <p>
                我们追求的不仅是进度与数据，更是团队合作带来的成就感和归属感。
                在 Eternal Flame，每一位成员都是不可或缺的火焰守护者。
              </p>
            </div>
          </div>

          {/* Server Info */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-bg-card border border-border-default rounded p-6 text-center">
              <MapPin className="w-6 h-6 text-wow-gold mx-auto mb-2" />
              <div className="text-xs text-text-muted">服务器</div>
              <div className="font-bold text-text-primary">待定</div>
            </div>
            <div className="bg-bg-card border border-border-default rounded p-6 text-center">
              <Swords className="w-6 h-6 text-wow-gold mx-auto mb-2" />
              <div className="text-xs text-text-muted">阵营</div>
              <div className="font-bold text-text-primary">待定</div>
            </div>
            <div className="bg-bg-card border border-border-default rounded p-6 text-center">
              <Calendar className="w-6 h-6 text-wow-gold mx-auto mb-2" />
              <div className="text-xs text-text-muted">活动方向</div>
              <div className="font-bold text-text-primary">PVE · Raid</div>
            </div>
          </div>

          {/* Leadership */}
          <div className="bg-bg-card border border-border-default rounded p-8 mb-8">
            <Crown className="w-10 h-10 text-wow-gold mb-4" />
            <h2 className="font-display text-2xl font-bold text-wow-gold mb-2">会阶</h2>
            <p className="text-sm text-text-muted mb-6">
              公会内部身份，与站点权限无关 —— 管理员不等于会长。
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {RANK_ROWS.map((row, i) => {
                const names = holders[row.rank] ?? [];
                const Icon = row.icon;
                // 「成员」人数太多，只显示数量
                const display =
                  row.rank === "MEMBER"
                    ? names.length > 0
                      ? `${names.length} 位`
                      : "暂无"
                    : names.length > 0
                      ? names.join("、")
                      : "待定";
                return (
                  <div key={i} className="flex gap-4 p-4 rounded bg-bg-secondary/50">
                    <div className="w-12 h-12 rounded-full bg-bg-card border border-border-gold flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-wow-gold" />
                    </div>
                    <div>
                      <div className="text-xs text-wow-gold font-bold mb-0.5">{row.label}</div>
                      <div className="font-bold text-text-primary">{display}</div>
                      <div className="text-xs text-text-muted mt-1">{row.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rules */}
          <div className="bg-bg-card border border-border-default rounded p-8">
            <Shield className="w-10 h-10 text-wow-gold mb-4" />
            <h2 className="font-display text-2xl font-bold text-wow-gold mb-6">公会规则</h2>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-wow-gold mt-0.5">▸</span>
                <span><strong className="text-text-primary">尊重他人：</strong>禁止任何形式的歧视、骚扰和不当言论。我们都是战友。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-wow-gold mt-0.5">▸</span>
                <span><strong className="text-text-primary">准时出勤：</strong>报名活动后请准时参加，无法出席请提前告知。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-wow-gold mt-0.5">▸</span>
                <span><strong className="text-text-primary">准备充分：</strong>活动前自行准备药水、食物、附魔和宝石。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-wow-gold mt-0.5">▸</span>
                <span><strong className="text-text-primary">积极沟通：</strong>有问题及时提出，有建议积极反馈。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-wow-gold mt-0.5">▸</span>
                <span><strong className="text-text-primary">分配规则：</strong>公会团本采用 DKP/Loot Council 制度，具体以公告为准。</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}