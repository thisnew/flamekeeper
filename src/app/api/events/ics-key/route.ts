import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminRole, isOfficerOrAboveRole } from "@/lib/roles";
import { appUrl } from "@/lib/app-url";
import { ensureCalendarFeedKey, rotateCalendarFeedKey } from "@/lib/calendar-feed";

/**
 * 查看日历订阅地址（官员及以上）。
 * 密钥不存在时**自动生成**，官员点开就能直接拿到可用的订阅链接。
 */
export async function GET() {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id || !isOfficerOrAboveRole(user.role)) {
      return NextResponse.json({ error: "仅官员可查看订阅地址" }, { status: 403 });
    }

    const key = await ensureCalendarFeedKey();
    const base = appUrl();
    const httpsUrl = `${base}/api/events/ics?key=${key}`;

    return NextResponse.json({
      success: true,
      key,
      httpsUrl,
      // 部分日历客户端（尤其 Apple）更认 webcal://
      webcalUrl: httpsUrl.replace(/^https?:\/\//, "webcal://"),
    });
  } catch (error) {
    console.error("[events/ics-key] GET:", error);
    return NextResponse.json({ error: "获取订阅地址失败" }, { status: 500 });
  }
}

/**
 * 轮换订阅密钥（仅管理员）。
 * 轮换后所有旧订阅链接立即失效 —— 密钥外泄时用它止损。
 */
export async function POST() {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "仅管理员可轮换订阅密钥" }, { status: 403 });
    }

    const key = await rotateCalendarFeedKey();
    const base = appUrl();
    const httpsUrl = `${base}/api/events/ics?key=${key}`;

    return NextResponse.json({
      success: true,
      key,
      httpsUrl,
      webcalUrl: httpsUrl.replace(/^https?:\/\//, "webcal://"),
      message: "订阅密钥已轮换，旧链接已失效",
    });
  } catch (error) {
    console.error("[events/ics-key] POST:", error);
    return NextResponse.json({ error: "轮换失败" }, { status: 500 });
  }
}
