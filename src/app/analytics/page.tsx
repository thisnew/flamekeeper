import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/page-guard";
import { BarChart3, Users, Sword, Shield, TrendingUp, Heart } from "lucide-react";
import {
  RoleChart,
  ClassChart,
  ItemLevelChart,
  type RoleDatum,
  type ClassDatum,
  type BucketDatum,
} from "@/components/analytics/AnalyticsCharts";

export const metadata: Metadata = {
  title: "数据分析",
  description: "Eternal Flame 公会数据分析看板",
};

async function getAnalytics() {
  try {
    const characters = await prisma.character.findMany();
    const totalMembers = characters.length;
    const activeRaid = characters.filter((c) => c.status === "ACTIVE").length;
    const ilevelled = characters.filter((c) => c.itemLevel && c.itemLevel > 0);
    const avgItemLevel = ilevelled.length > 0
      ? Math.round(ilevelled.reduce((sum, c) => sum + (c.itemLevel || 0), 0) / ilevelled.length)
      : 0;

    // WTF 导入的角色没有职业/职能信息，统一归到「未知」
    const classMap: Record<string, number> = {};
    characters.forEach((c) => {
      const key = c.class || "未知";
      classMap[key] = (classMap[key] || 0) + 1;
    });
    const classData: ClassDatum[] = Object.entries(classMap).map(([name, value]) => ({ name, value }));

    const roleMap: Record<string, number> = { Tank: 0, Healer: 0, DPS: 0, 未知: 0 };
    characters.forEach((c) => {
      const key = c.role || "未知";
      roleMap[key] = (roleMap[key] || 0) + 1;
    });
    const roleData: RoleDatum[] = [
      { name: "坦克", value: roleMap.Tank, color: "#69CCF0" },
      { name: "治疗", value: roleMap.Healer, color: "#1EFF00" },
      { name: "DPS", value: roleMap.DPS, color: "#FF7D0A" },
      { name: "未知", value: roleMap["未知"], color: "#9D9D9D" },
    ];

    const buckets: BucketDatum[] = [
      { range: "< 590", count: 0 },
      { range: "590-610", count: 0 },
      { range: "610-630", count: 0 },
      { range: "630-650", count: 0 },
      { range: "650+", count: 0 },
    ];
    characters.forEach((c) => {
      const ilvl = c.itemLevel || 0;
      if (ilvl < 590) buckets[0].count++;
      else if (ilvl < 610) buckets[1].count++;
      else if (ilvl < 630) buckets[2].count++;
      else if (ilvl < 650) buckets[3].count++;
      else if (ilvl >= 650) buckets[4].count++;
    });

    return { totalMembers, activeRaid, avgItemLevel, classData, roleData, buckets, hasData: characters.length > 0 };
  } catch {
    return { totalMembers: 0, activeRaid: 0, avgItemLevel: 0, classData: [], roleData: [], buckets: [], hasData: false };
  }
}

export default async function AnalyticsPage() {
  await requireMember();

  const data = await getAnalytics();

  return (
    <div className="page-enter">
      <section className="py-16 border-b border-border-default bg-gradient-to-b from-bg-secondary/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <BarChart3 className="w-12 h-12 text-wow-gold mx-auto mb-4" />
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-wow-gold text-glow mb-4">数据分析</h1>
          <p className="text-text-secondary">公会数据一览，团队实力可视化</p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-bg-card border border-border-default rounded p-6 text-center wow-border">
              <Users className="w-6 h-6 text-wow-gold mx-auto mb-2" />
              <div className="text-2xl font-bold text-wow-gold font-mono">{data.totalMembers}</div>
              <div className="text-xs text-text-muted mt-1">公会总人数</div>
            </div>
            <div className="bg-bg-card border border-border-default rounded p-6 text-center">
              <Sword className="w-6 h-6 text-wow-gold mx-auto mb-2" />
              <div className="text-2xl font-bold text-wow-gold font-mono">{data.activeRaid}</div>
              <div className="text-xs text-text-muted mt-1">活跃团本成员</div>
            </div>
            <div className="bg-bg-card border border-border-default rounded p-6 text-center">
              <Shield className="w-6 h-6 text-wow-gold mx-auto mb-2" />
              <div className="text-2xl font-bold text-wow-gold font-mono">{data.avgItemLevel || '--'}</div>
              <div className="text-xs text-text-muted mt-1">平均装等</div>
            </div>
            <div className="bg-bg-card border border-border-default rounded p-6 text-center">
              <Heart className="w-6 h-6 text-wow-gold mx-auto mb-2" />
              <div className="text-2xl font-bold text-wow-green font-mono">--</div>
              <div className="text-xs text-text-muted mt-1">本周出勤率</div>
            </div>
          </div>
        </div>
      </section>

      {!data.hasData && (
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="bg-bg-card border border-border-default rounded p-8 text-center">
              <BarChart3 className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
              <h3 className="font-bold text-text-primary mb-2">数据采集中...</h3>
              <p className="text-sm text-text-muted">
                请管理员在「管理后台 → 成员名册」中添加公会成员后，数据看板将自动呈现。
              </p>
            </div>
          </div>
        </section>
      )}

      {data.hasData && (
        <>
          <section className="py-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-8">
              <div className="bg-bg-card border border-border-default rounded p-6">
                <h3 className="font-display text-lg font-bold text-wow-gold mb-6">职能分布</h3>
                <RoleChart data={data.roleData} />
              </div>

              <div className="bg-bg-card border border-border-default rounded p-6">
                <h3 className="font-display text-lg font-bold text-wow-gold mb-6">职业分布</h3>
                <ClassChart data={data.classData} />
              </div>
            </div>
          </section>

          <section className="py-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="bg-bg-card border border-border-default rounded p-6">
                <h3 className="font-display text-lg font-bold text-wow-gold mb-6">装等分布</h3>
                <ItemLevelChart data={data.buckets} />
              </div>
            </div>
          </section>
        </>
      )}

      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-wow-gold mb-8">团本进度</h2>
          <div className="bg-bg-card border border-border-default rounded p-6">
            <div className="h-40 flex items-center justify-center text-text-muted">
              <div className="text-center">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">进度数据将在团本开启后更新</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}