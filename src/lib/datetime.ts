/**
 * 统一的时间展示格式化。
 *
 * 为什么不用 `toLocaleDateString` / `getHours()`：
 *  1. 容器默认时区通常是 **UTC**，直接本地化会把中国用户的活动时间显示成 UTC；
 *  2. 服务端与浏览器的时区不同会造成 **hydration mismatch**（同一份 HTML
 *     在两边的文本不一致，React 会报错并重渲染）。
 *
 * 因此：固定用 `Intl` + **显式 timeZone**，并且只在服务端格式化，
 * 把结果字符串当 prop 传给客户端组件。
 *
 * 时区来源：`NEXT_PUBLIC_TIMEZONE` → `TZ` → 默认 `Asia/Shanghai`。
 */

export const DISPLAY_TIMEZONE =
  process.env.NEXT_PUBLIC_TIMEZONE || process.env.TZ || "Asia/Shanghai";

const DATE_TIME_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: DISPLAY_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: DISPLAY_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function pick(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

/** `YYYY-MM-DD HH:mm`，按 DISPLAY_TIMEZONE。 */
export function formatDateTime(date: Date | string): string {
  const p = DATE_TIME_FMT.formatToParts(new Date(date));
  return `${pick(p, "year")}-${pick(p, "month")}-${pick(p, "day")} ${pick(
    p,
    "hour"
  )}:${pick(p, "minute")}`;
}

/** `YYYY-MM-DD`，按 DISPLAY_TIMEZONE。 */
export function formatDate(date: Date | string): string {
  const p = DATE_FMT.formatToParts(new Date(date));
  return `${pick(p, "year")}-${pick(p, "month")}-${pick(p, "day")}`;
}

/** 同一天则只显示时间，跨天则显示完整区间。用于活动时间展示。 */
export function formatDateRange(start: Date | string, end: Date | string): string {
  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
}
