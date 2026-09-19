import { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/page-guard";
import { isOfficerOrAboveRole } from "@/lib/roles";
import { formatDateTime } from "@/lib/datetime";
import EventSignupPanel, { type EventView } from "@/components/events/EventSignupPanel";

export const metadata: Metadata = {
  title: "活动日历",
  description: "Eternal Flame 公会活动日历：团本、大秘境、PVP 活动安排与报名。",
};

/** 已结束的活动排到最后，其余按开始时间升序。 */
function sortEvents<T extends { endTime: Date; startTime: Date }>(events: T[]): T[] {
  const now = Date.now();
  return [...events].sort((a, b) => {
    const aEnded = a.endTime.getTime() < now;
    const bEnded = b.endTime.getTime() < now;
    if (aEnded !== bEnded) return aEnded ? 1 : -1;
    return a.startTime.getTime() - b.startTime.getTime();
  });
}

export default async function EventsPage() {
  const user = await requireMember();
  const isOfficer = isOfficerOrAboveRole(user.role);

  let events: EventView[] = [];
  try {
    const rows = await prisma.event.findMany({
      include: {
        signups: {
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    events = sortEvents(rows).map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      eventType: e.eventType,
      // 服务端按 DISPLAY_TIMEZONE 格式化，客户端只负责显示
      startLabel: formatDateTime(e.startTime),
      endLabel: formatDateTime(e.endTime),
      endTimeIso: e.endTime.toISOString(),
      maxSlots: e.maxSlots,
      location: e.location,
      signups: e.signups.map((s) => ({
        id: s.id,
        userId: s.userId,
        status: s.status,
        attendance: s.attendance,
        note: s.note,
        user: { id: s.user.id, name: s.user.name, email: s.user.email },
      })),
    }));
  } catch (error) {
    // 数据库不可用时不要整页 500 —— 与首页一致，降级成「暂无活动」
    console.error("Events page query failed:", error);
    events = [];
  }

  return (
    <div className="page-enter">
      <section className="py-16 border-b border-border-default bg-gradient-to-b from-bg-secondary/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <CalendarDays className="w-12 h-12 text-wow-gold mx-auto mb-4" />
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-wow-gold text-glow mb-4">
            活动日历
          </h1>
          <p className="text-text-secondary">公会活动安排与报名</p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {events.length === 0 ? (
            <div className="text-center py-20 text-text-muted border border-border-default rounded bg-bg-card">
              <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>暂无活动安排，敬请期待</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <EventSignupPanel
                  key={event.id}
                  event={event}
                  currentUserId={user.id}
                  isOfficer={isOfficer}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
