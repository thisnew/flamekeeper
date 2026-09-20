/**
 * 文章评论：审核开关与初始状态判定（服务端）。
 *
 * 规则：
 *  - 官员 / 管理员自己发的评论**直接通过** —— 他们本来就是审核者，
 *    让自己审自己没意义。
 *  - 其他成员：看 `comment_moderation` 设置。开启（默认）→ PENDING，
 *    关闭 → 直接 APPROVED。
 *  - 读不到设置时**按开启处理** —— 宁严勿松，配置缺失不应导致内容失控。
 */
import { prisma } from "@/lib/prisma";
import { isOfficerOrAboveRole } from "@/lib/roles";

export const COMMENT_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export function isCommentStatus(v: unknown): v is CommentStatus {
  return typeof v === "string" && (COMMENT_STATUSES as readonly string[]).includes(v);
}

export const COMMENT_STATUS_LABELS: Record<CommentStatus, string> = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已拒绝",
};

/** 把任意字符串安全地映射成中文标签（非法值原样返回）。 */
export function commentStatusLabel(status: string): string {
  return isCommentStatus(status) ? COMMENT_STATUS_LABELS[status] : status;
}

/** 系统设置里的审核开关 key。 */
export const COMMENT_MODERATION_SETTING = "comment_moderation";

/** 评论正文长度上限（字符）。 */
export const COMMENT_MAX_LENGTH = 1000;

/** 审核是否开启。默认开启。 */
export async function isCommentModerationOn(): Promise<boolean> {
  try {
    const row = await prisma.setting.findUnique({
      where: { key: COMMENT_MODERATION_SETTING },
      select: { value: true },
    });
    if (!row) return true;
    return row.value !== "false";
  } catch {
    return true;
  }
}

/** 新评论的初始审核状态。 */
export async function initialCommentStatus(role?: string | null): Promise<CommentStatus> {
  if (isOfficerOrAboveRole(role)) return "APPROVED";
  return (await isCommentModerationOn()) ? "PENDING" : "APPROVED";
}

/**
 * 校验并规整评论正文。
 * 返回规范化后的文本，或错误信息。
 */
export function normalizeCommentContent(
  raw: unknown
): { ok: true; content: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "评论内容格式不正确" };

  // 统一换行，去掉首尾空白；把连续 3 个以上空行压成 2 个，防止刷屏
  const content = raw
    .replace(/\r\n?/g, "\n")
    .trim()
    .replace(/\n{3,}/g, "\n\n");

  if (!content) return { ok: false, error: "评论内容不能为空" };
  if (content.length > COMMENT_MAX_LENGTH) {
    return { ok: false, error: `评论最多 ${COMMENT_MAX_LENGTH} 个字符` };
  }
  return { ok: true, content };
}
