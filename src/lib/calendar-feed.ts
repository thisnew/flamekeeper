/**
 * 日历订阅密钥（公会级）。
 *
 * `/events` 页面是登录可见的，但 Google Calendar / Apple 日历订阅时带不了
 * cookie。所以用一个公会级的订阅密钥作为凭据：
 *
 *   /api/events/ics?key=<密钥>
 *
 * 密钥存在 `Setting` 表的 `calendar_feed_key`。**刻意不放进 settings 接口的
 * PUBLIC_KEYS 白名单** —— 那个接口是公开的，放进去等于把密钥公开。
 * 官员通过 `/api/events/ics-key` 获取（不存在时自动生成）与轮换。
 */
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const CALENDAR_FEED_KEY_SETTING = "calendar_feed_key";

/** 生成新的订阅密钥（32 字节，64 个十六进制字符）。 */
export function generateCalendarFeedKey(): string {
  return randomBytes(32).toString("hex");
}

/** 读取现有密钥，不存在返回 null。 */
export async function getCalendarFeedKey(): Promise<string | null> {
  const row = await prisma.setting.findUnique({
    where: { key: CALENDAR_FEED_KEY_SETTING },
    select: { value: true },
  });
  return row?.value || null;
}

/**
 * 取密钥，不存在则生成并落库。
 *
 * 并发安全的做法：先读；没有就 create，撞唯一约束时说明别的请求刚建好，
 * 读回来即可。不用 upsert 是因为它在并发下仍可能两边都走 create 分支。
 */
export async function ensureCalendarFeedKey(): Promise<string> {
  const existing = await getCalendarFeedKey();
  if (existing) return existing;

  const key = generateCalendarFeedKey();
  try {
    await prisma.setting.create({
      data: { key: CALENDAR_FEED_KEY_SETTING, value: key },
    });
    return key;
  } catch {
    const raced = await getCalendarFeedKey();
    return raced ?? key;
  }
}

/** 轮换密钥（旧的订阅链接随即失效）。 */
export async function rotateCalendarFeedKey(): Promise<string> {
  const key = generateCalendarFeedKey();
  await prisma.setting.upsert({
    where: { key: CALENDAR_FEED_KEY_SETTING },
    update: { value: key },
    create: { key: CALENDAR_FEED_KEY_SETTING, value: key },
  });
  return key;
}

/**
 * 定时安全比较，避免通过响应时间逐字节猜密钥。
 * 长度不同直接返回 false（长度本身不是秘密）。
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
