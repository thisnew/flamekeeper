import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isMemberOrAboveRole, isOfficerOrAboveRole } from "@/lib/roles";
import {
  backfillAfterCancel,
  hasEnded,
  isAttendance,
  isSignupStatus,
  resolveSignupStatus,
} from "@/lib/event-signup";

const NOTE_MAX = 200;

/**
 * 报名（或取消后再报名）。
 *
 * 名额判定与写入放在同一个事务里，并先用 `SELECT ... FOR UPDATE` 锁住
 * 活动行 —— 否则两人同时报名会把名额挤爆（ReadCommitted 下 count 读不到
 * 对方未提交的插入）。锁是按活动行粒度的，不同活动之间不互相阻塞。
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id || !isMemberOrAboveRole(user.role)) {
      return NextResponse.json({ error: "仅公会成员可报名" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const eventId = typeof body.eventId === "string" ? body.eventId : "";
    const note =
      typeof body.note === "string" ? body.note.trim().slice(0, NOTE_MAX) : "";

    if (!eventId) {
      return NextResponse.json({ error: "缺少活动 id" }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, maxSlots: true, endTime: true, title: true },
    });
    if (!event) {
      return NextResponse.json({ error: "活动不存在" }, { status: 404 });
    }
    if (hasEnded(event.endTime)) {
      return NextResponse.json({ error: "活动已结束，无法报名" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 锁住活动行，串行化同一活动的并发报名
      await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;

      const status = await resolveSignupStatus(eventId, event.maxSlots, tx);

      const signup = await tx.eventSignup.upsert({
        where: { eventId_userId: { eventId, userId: user.id } },
        update: { status, note: note || null },
        create: { eventId, userId: user.id, status, note: note || null },
        select: { id: true, status: true },
      });

      return signup;
    });

    return NextResponse.json({
      success: true,
      status: result.status,
      message: result.status === "BENCH" ? "名额已满，你已进入替补队列" : "报名成功",
    });
  } catch (error) {
    console.error("[events/signup] POST:", error);
    return NextResponse.json({ error: "报名失败，请稍后再试" }, { status: 500 });
  }
}

/**
 * 取消报名。若原本占着正式名额，会按报名先后把最早的替补提上来。
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id || !isMemberOrAboveRole(user.role)) {
      return NextResponse.json({ error: "仅公会成员可操作" }, { status: 403 });
    }

    const eventId = new URL(req.url).searchParams.get("eventId");
    if (!eventId) {
      return NextResponse.json({ error: "缺少活动 id" }, { status: 400 });
    }

    const existing = await prisma.eventSignup.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
      select: { id: true, status: true },
    });
    if (!existing || existing.status === "CANCELLED") {
      return NextResponse.json({ error: "你尚未报名该活动" }, { status: 404 });
    }

    const wasConfirmed = existing.status === "CONFIRMED";

    const promoted = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;

      // 保留记录（CANCELLED）而不是删除：出勤统计需要历史，再报名也直接复用这一行
      await tx.eventSignup.update({
        where: { id: existing.id },
        data: { status: "CANCELLED" },
      });

      return backfillAfterCancel(eventId, wasConfirmed, tx);
    });

    return NextResponse.json({
      success: true,
      promoted: promoted ? promoted.userId : null,
      message: promoted ? "已取消报名，并已从替补队列补上一位" : "已取消报名",
    });
  } catch (error) {
    console.error("[events/signup] DELETE:", error);
    return NextResponse.json({ error: "取消失败，请稍后再试" }, { status: 500 });
  }
}

/**
 * 官员操作：改某人的报名状态（正式 / 替补 / 取消）或标记出勤。
 * 出勤与报名状态相互独立 —— 未报名的人不该被标出勤，所以只有存在
 * signup 记录才允许标记。
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const actor = session?.user as any;
    if (!actor?.id || !isOfficerOrAboveRole(actor.role)) {
      return NextResponse.json({ error: "仅官员可调整报名与出勤" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const signupId = typeof body.signupId === "string" ? body.signupId : "";
    if (!signupId) {
      return NextResponse.json({ error: "缺少 signupId" }, { status: 400 });
    }

    const wantsStatus = body.status !== undefined;
    const wantsAttendance = body.attendance !== undefined;

    if (!wantsStatus && !wantsAttendance) {
      return NextResponse.json({ error: "没有需要更新的字段" }, { status: 400 });
    }
    if (wantsStatus && !isSignupStatus(body.status)) {
      return NextResponse.json({ error: "报名状态非法" }, { status: 400 });
    }
    if (wantsAttendance && body.attendance !== null && !isAttendance(body.attendance)) {
      return NextResponse.json({ error: "出勤状态非法" }, { status: 400 });
    }

    const target = await prisma.eventSignup.findUnique({
      where: { id: signupId },
      select: { id: true, eventId: true, userId: true, status: true },
    });
    if (!target) {
      return NextResponse.json({ error: "报名记录不存在" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (wantsStatus) data.status = body.status;
    if (wantsAttendance) {
      data.attendance = body.attendance;
      data.markedAt = body.attendance === null ? null : new Date();
    }

    const promoted = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${target.eventId} FOR UPDATE`;

      await tx.eventSignup.update({ where: { id: signupId }, data });

      // 原来是正式名额、现在让出来了 -> 补位
      if (wantsStatus && target.status === "CONFIRMED" && body.status !== "CONFIRMED") {
        return backfillAfterCancel(target.eventId, true, tx);
      }
      return null;
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: "EVENT_SIGNUP_UPDATE",
        detail: `调整报名记录 ${signupId}${
          wantsStatus ? ` 状态=${body.status}` : ""
        }${wantsAttendance ? ` 出勤=${body.attendance ?? "未标记"}` : ""}`,
      },
    });

    return NextResponse.json({
      success: true,
      promoted: promoted ? promoted.userId : null,
      message: promoted ? "已更新，并已从替补队列补上一位" : "已更新",
    });
  } catch (error) {
    console.error("[events/signup] PATCH:", error);
    return NextResponse.json({ error: "更新失败，请稍后再试" }, { status: 500 });
  }
}
