/**
 * iCalendar (RFC 5545) 生成。
 *
 * 两个容易踩的点：
 *  1. **折行按字节而不是字符**。规范要求每行不超过 75 **octets**，续行以
 *     单个空格开头。中文在 UTF-8 下是 3 字节/字，按字符数折会把多字节字符
 *     劈成两半，日历 App 直接解析失败。
 *  2. **文本必须转义** `\` `;` `,` 和换行 —— 否则标题里的逗号会被当成
 *     字段分隔符。
 */
import { DISPLAY_TIMEZONE } from "@/lib/datetime";

/** RFC 5545 TEXT 转义。 */
export function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

const MAX_OCTETS = 75;

/**
 * 折行：按 UTF-8 字节数切分，续行前加一个空格。
 * 逐「码点」累积而不是逐字节，保证 never 把多字节字符截断。
 */
export function foldIcsLine(line: string): string {
  if (Buffer.byteLength(line, "utf8") <= MAX_OCTETS) return line;

  const chunks: string[] = [];
  let current = "";
  for (const ch of line) {
    // 续行自带一个前导空格，所以内容只剩 74 字节
    const budget = chunks.length === 0 ? MAX_OCTETS : MAX_OCTETS - 1;
    if (Buffer.byteLength(current, "utf8") + Buffer.byteLength(ch, "utf8") > budget) {
      chunks.push(current);
      current = "";
    }
    current += ch;
  }
  if (current) chunks.push(current);

  return chunks.join("\r\n ");
}

/** UTC 时间戳：`20260315T120000Z`。 */
export function icsTimestamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export type IcsEvent = {
  id: string;
  title: string;
  description: string | null;
  eventTypeLabel: string;
  location: string | null;
  startTime: Date;
  endTime: Date;
  /** 可选的报名情况，用于 DESCRIPTION */
  signupSummary?: string;
  cancelled?: boolean;
};

export type BuildCalendarParams = {
  events: IcsEvent[];
  calendarName: string;
  /** 用于拼 UID 的域名，保证跨日历唯一 */
  uidHost: string;
  /** 生成时间；注入以便测试可复现 */
  now?: Date;
};

export function buildCalendar({
  events,
  calendarName,
  uidHost,
  now = new Date(),
}: BuildCalendarParams): string {
  const out: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Eternal Flame//Flamekeeper//CN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    `X-WR-TIMEZONE:${DISPLAY_TIMEZONE}`,
  ];

  const stamp = icsTimestamp(now);

  for (const e of events) {
    // DTEND 必须晚于 DTSTART，否则事件在多数客户端里不显示
    let end = e.endTime;
    if (end.getTime() <= e.startTime.getTime()) {
      end = new Date(e.startTime.getTime() + 60 * 60 * 1000);
    }

    const descParts = [`类型：${e.eventTypeLabel}`];
    if (e.signupSummary) descParts.push(e.signupSummary);
    if (e.description) descParts.push("", e.description);

    out.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@${uidHost}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsTimestamp(e.startTime)}`,
      `DTEND:${icsTimestamp(end)}`,
      `SUMMARY:${escapeIcsText(e.title)}`,
      `DESCRIPTION:${escapeIcsText(descParts.join("\n"))}`,
      ...(e.location ? [`LOCATION:${escapeIcsText(e.location)}`] : []),
      "TRANSP:OPAQUE",
      "END:VEVENT"
    );
  }

  out.push("END:VCALENDAR");

  // 折行后再统一用 CRLF 连接 —— 规范要求 CRLF，而折行本身也插入 CRLF+空格
  return out.map(foldIcsLine).join("\r\n") + "\r\n";
}
