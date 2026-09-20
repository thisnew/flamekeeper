import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appUrlObject } from "@/lib/app-url";
import { buildCalendar, type IcsEvent } from "@/lib/ics";
import { getCalendarFeedKey, safeEqual } from "@/lib/calendar-feed";

const EVENT_TYPE_LABELS: Record<string, string> = {
  RAID: "团本",
  MPLUS: "大秘境",
  PVP: "PVP",
  SOCIAL: "聚会",
  OTHER: "其他",
};

/**
 * 日历订阅源。凭据是公会级密钥（query 参数 `key`），因为日历 App 带不了 cookie。
 *
 * 校验失败一律返回 **404**（不是 401/403）—— 不告诉扫描者「这个端点存在、
 * 只是密钥不对」，减少被试探的动机。
 */
export async function GET(req: NextRequest) {
  try {
    const provided = new URL(req.url).searchParams.get("key") ?? "";
    const expected = await getCalendarFeedKey();

    if (!expected || !provided || !safeEqual(provided, expected)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rows = await prisma.event.findMany({
      orderBy: { startTime: "asc" },
      include: { signups: { select: { status: true } } },
    });

    const events: IcsEvent[] = rows.map((e) => {
      const confirmed = e.signups.filter((s) => s.status === "CONFIRMED").length;
      const bench = e.signups.filter((s) => s.status === "BENCH").length;
      return {
        id: e.id,
        title: e.title,
        description: e.description,
        eventTypeLabel: EVENT_TYPE_LABELS[e.eventType] ?? e.eventType,
        location: e.location,
        startTime: e.startTime,
        endTime: e.endTime,
        signupSummary:
          e.maxSlots != null
            ? `报名：${confirmed}/${e.maxSlots}${bench ? `（替补 ${bench}）` : ""}`
            : `报名：${confirmed} 人${bench ? `（替补 ${bench}）` : ""}`,
      };
    });

    // UID 用 hostname（**不含端口**）：UID 的约定是 `<唯一id>@<域名>`，
    // 而 `host` 会带上 :22247 这类端口号，冒号让域名部分不再合法。
    const uidHost = appUrlObject().hostname;

    const ics = buildCalendar({
      events,
      calendarName: "Eternal Flame 守焰者 活动日历",
      uidHost,
    });

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        // 日历客户端会定期回访，不要让它拿到缓存
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[events/ics] GET:", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
