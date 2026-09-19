/**
 * 活动报名 / 替补 / 出勤 的共享逻辑（服务端）。
 *
 * 状态机：
 *   CONFIRMED  正式名额
 *   BENCH      替补（名额满了之后进入）
 *   CANCELLED  已取消（保留记录，便于出勤统计与再次报名）
 *
 * 出勤（attendance，独立于报名状态）：
 *   null 未标记 | ATTENDED 已出席 | ABSENT 缺席 | LEAVE 已请假
 */
import { prisma } from "@/lib/prisma";

export type SignupStatus = "CONFIRMED" | "BENCH" | "CANCELLED";
export type Attendance = "ATTENDED" | "ABSENT" | "LEAVE";

export const SIGNUP_STATUSES: SignupStatus[] = ["CONFIRMED", "BENCH", "CANCELLED"];
export const ATTENDANCES: Attendance[] = ["ATTENDED", "ABSENT", "LEAVE"];

export function isSignupStatus(v: unknown): v is SignupStatus {
  return typeof v === "string" && (SIGNUP_STATUSES as string[]).includes(v);
}

export function isAttendance(v: unknown): v is Attendance {
  return typeof v === "string" && (ATTENDANCES as string[]).includes(v);
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** 统计某活动的正式名额占用数（不含替补 / 已取消）。 */
export async function countConfirmed(
  eventId: string,
  db: Tx | typeof prisma = prisma
): Promise<number> {
  return db.eventSignup.count({ where: { eventId, status: "CONFIRMED" } });
}

/**
 * 判断新报名者应落到哪个状态。
 * maxSlots 为空 = 不限名额，一律 CONFIRMED。
 */
export async function resolveSignupStatus(
  eventId: string,
  maxSlots: number | null,
  db: Tx | typeof prisma = prisma
): Promise<SignupStatus> {
  if (!maxSlots || maxSlots <= 0) return "CONFIRMED";
  const confirmed = await countConfirmed(eventId, db);
  return confirmed < maxSlots ? "CONFIRMED" : "BENCH";
}

/**
 * 名额空出后，把最早报名的替补提为正式。
 * 返回被提上来的人；没有替补则返回 null。
 *
 * 按 createdAt 升序 = 先报先得，符合直觉的排队语义。
 */
export async function promoteNextBench(
  eventId: string,
  db: Tx | typeof prisma = prisma
): Promise<{ id: string; userId: string } | null> {
  const next = await db.eventSignup.findFirst({
    where: { eventId, status: "BENCH" },
    orderBy: { createdAt: "asc" },
    select: { id: true, userId: true },
  });
  if (!next) return null;

  await db.eventSignup.update({
    where: { id: next.id },
    data: { status: "CONFIRMED" },
  });
  return next;
}

/**
 * 取消一个正式名额后，尝试补位。
 * 只有原本占着正式名额的人取消，才需要补位。
 */
export async function backfillAfterCancel(
  eventId: string,
  wasConfirmed: boolean,
  db: Tx | typeof prisma = prisma
): Promise<{ id: string; userId: string } | null> {
  if (!wasConfirmed) return null;
  return promoteNextBench(eventId, db);
}

/** 活动是否已结束（结束后不再允许报名/取消）。 */
export function hasEnded(endTime: Date): boolean {
  return endTime.getTime() < Date.now();
}

/** 出勤统计汇总，用于导出与页面展示。 */
export function summarize(rows: { status: string; attendance: string | null }[]) {
  const confirmed = rows.filter((r) => r.status === "CONFIRMED");
  const bench = rows.filter((r) => r.status === "BENCH");
  const cancelled = rows.filter((r) => r.status === "CANCELLED");
  return {
    confirmed: confirmed.length,
    bench: bench.length,
    cancelled: cancelled.length,
    attended: confirmed.filter((r) => r.attendance === "ATTENDED").length,
    absent: confirmed.filter((r) => r.attendance === "ABSENT").length,
    leave: confirmed.filter((r) => r.attendance === "LEAVE").length,
    unmarked: confirmed.filter((r) => r.attendance === null).length,
  };
}
