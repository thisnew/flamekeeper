import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOfficerOrAboveRole } from "@/lib/roles";

import { maskEmail } from "@/lib/privacy";
const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "正式",
  BENCH: "替补",
  CANCELLED: "已取消",
};

const ATTENDANCE_LABELS: Record<string, string> = {
  ATTENDED: "已出席",
  ABSENT: "缺席",
  LEAVE: "已请假",
};

/** CSV 字段转义：一律加引号，内部引号翻倍。 */
function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(",");
}

/** 把 Date 格式化成活动所在时区的可读文本，避免导出后看不懂。 */
function fmt(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/**
 * 导出活动名单为 CSV（官员及以上）。
 *
 * 输出带 UTF-8 BOM —— 否则 Excel 在中文 Windows 上会把中文显示成乱码。
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id || !isOfficerOrAboveRole(user.role)) {
      return NextResponse.json({ error: "仅官员可导出名单" }, { status: 403 });
    }

    const eventId = new URL(req.url).searchParams.get("eventId");
    if (!eventId) {
      return NextResponse.json({ error: "缺少活动 id" }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        signups: {
          orderBy: [{ status: "asc" }, { createdAt: "asc" }],
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });
    if (!event) {
      return NextResponse.json({ error: "活动不存在" }, { status: 404 });
    }

    const lines = [
      toCsvRow([`活动：${event.title}`]),
      toCsvRow([
        `时间：${fmt(event.startTime)} - ${fmt(event.endTime)}`,
        event.location ? `地点：${event.location}` : "",
      ]),
      "",
      toCsvRow(["状态", "昵称", "邮箱", "出勤", "备注", "报名时间"]),
    ];

    for (const s of event.signups) {
      lines.push(
        toCsvRow([
          STATUS_LABELS[s.status] ?? s.status,
          s.user?.name ?? "",
          // 导出的 CSV 会离开站点，**必须在数据层遮蔽** —— 它不经过任何 React 渲染
          maskEmail(s.user?.email),
          s.attendance ? ATTENDANCE_LABELS[s.attendance] ?? s.attendance : "未标记",
          s.note ?? "",
          fmt(s.createdAt),
        ])
      );
    }

    // 统计摘要，方便官员一眼看完出勤率
    const confirmed = event.signups.filter((s) => s.status === "CONFIRMED");
    lines.push("");
    lines.push(
      toCsvRow([
        `合计：正式 ${confirmed.length} / 替补 ${
          event.signups.filter((s) => s.status === "BENCH").length
        } / 已取消 ${event.signups.filter((s) => s.status === "CANCELLED").length}`,
      ])
    );
    lines.push(
      toCsvRow([
        `出勤：已出席 ${
          confirmed.filter((s) => s.attendance === "ATTENDED").length
        } / 缺席 ${confirmed.filter((s) => s.attendance === "ABSENT").length} / 请假 ${
          confirmed.filter((s) => s.attendance === "LEAVE").length
        } / 未标记 ${confirmed.filter((s) => s.attendance === null).length}`,
      ])
    );

    const csv = "\uFEFF" + lines.join("\r\n") + "\r\n";

    // 文件名：活动标题可能是中文，但 HTTP 头只能是 Latin-1（ByteString），
    // 直接把中文写进 filename= 会让 Response 构造抛 TypeError。
    // 所以：filename 用降级后的 ASCII 名，filename* 用 RFC 5987 编码保留中文。
    const base = `event-${(event.title || "list").replace(/[\\/:*?"<>|]/g, "_")}`.slice(0, 60);
    const asciiName = `${base.replace(/[^\x20-\x7E]/g, "_")}.csv`;
    const utf8Name = `${base}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(
          utf8Name
        )}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[events/export] GET:", error);
    return NextResponse.json({ error: "导出失败，请稍后再试" }, { status: 500 });
  }
}
