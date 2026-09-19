import { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, MapPin, Clock, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "活动日历",
  description: "Eternal Flame 公会活动日历：团本、大秘境、PVP 活动安排与报名。",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  RAID: "团本",
  MPLUS: "大秘境",
  PVP: "PVP",
  SOCIAL: "聚会",
  OTHER: "其他",
};

async function getEvents() {
  try {
    return await prisma.event.findMany({
      orderBy: { startTime: "asc" },
      include: { signups: true },
    });
  } catch {
    return [];
  }
}

export default async function EventsPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const events = await getEvents();

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
              <p>暂无活动安排，敬请关注</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="bg-bg-card border border-border-default rounded p-6 hover:border-border-gold transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 bg-wow-gold/10 text-wow-gold border border-border-gold rounded">
                          {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg text-text-primary mb-3">{event.title}</h3>
                      <div className="flex flex-col sm:flex-row gap-4 text-sm text-text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(event.startTime)} - {formatDate(event.endTime)}
                        </span>
                        {event.maxSlots && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {event.signups.length}/{event.maxSlots}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}