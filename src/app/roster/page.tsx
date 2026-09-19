import { Metadata } from "next";
import { Shield, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CLASS_COLORS } from "@/lib/utils";

export const metadata: Metadata = {
  title: "成员名册",
  description: "查看 Eternal Flame 公会成员名单，职业、专精、进度一览。",
};

async function getRoster() {
  try {
    return await prisma.character.findMany({
      where: { isPublic: true },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: { user: { select: { name: true } } },
    });
  } catch {
    return [];
  }
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "主力",
  BENCH: "替补",
  CASUAL: "休闲",
  LEFT: "已离会",
};

export default async function RosterPage() {
  const characters = await getRoster();

  return (
    <div className="page-enter">
      <section className="py-16 border-b border-border-default bg-gradient-to-b from-bg-secondary/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Shield className="w-12 h-12 text-wow-gold mx-auto mb-4" />
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-wow-gold text-glow mb-4">
            成员名册
          </h1>
          <p className="text-text-secondary">守护火焰的勇士们</p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {characters.length === 0 ? (
            <div className="text-center py-20 text-text-muted border border-border-default rounded bg-bg-card">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>成员名册暂未开放</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-gold">
                    <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider">角色</th>
                    <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider">职业</th>
                    <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider">专精</th>
                    <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider">职能</th>
                    <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider hidden sm:table-cell">服务器</th>
                    <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider hidden md:table-cell">装等</th>
                    <th className="text-left py-3 px-4 text-wow-gold font-display text-xs tracking-wider">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {characters.map((char) => (
                    <tr key={char.id} className="border-b border-border-default hover:bg-bg-card/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-text-primary">{char.name}</span>
                      </td>
                      <td className={`py-3 px-4 font-medium ${CLASS_COLORS[char.class] || "text-text-secondary"}`}>
                        {char.class}
                      </td>
                      <td className="py-3 px-4 text-text-muted">{char.spec}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          char.role === "Tank" ? "bg-wow-blue/20 text-wow-blue-light" :
                          char.role === "Healer" ? "bg-wow-green/20 text-wow-green" :
                          "bg-wow-red/20 text-wow-red"
                        }`}>
                          {char.role === "Tank" ? "坦克" : char.role === "Healer" ? "治疗" : "DPS"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-text-muted hidden sm:table-cell">{char.server}</td>
                      <td className="py-3 px-4 text-text-muted hidden md:table-cell">
                        {char.itemLevel ? (
                          <span className={`font-mono ${
                            char.itemLevel >= 630 ? "text-wow-purple" :
                            char.itemLevel >= 610 ? "text-wow-blue-light" : "text-text-secondary"
                          }`}>{char.itemLevel}</span>
                        ) : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs ${
                          char.status === "ACTIVE" ? "text-wow-green" :
                          char.status === "BENCH" ? "text-wow-gold" :
                          "text-text-muted"
                        }`}>{STATUS_LABELS[char.status] || char.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}