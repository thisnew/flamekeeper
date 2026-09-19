/**
 * 密码重置令牌的生成 / 摘要 / 校验 / 限流。
 *
 * 安全设计（服务端专用）：
 *  - 原始令牌只出现在邮件链接里，**从不落库**；库里只存 SHA-256 摘要。
 *    拿到数据库也无法直接用它改密码。
 *  - 用 SHA-256 而非 bcrypt：令牌本身是 32 字节随机数，熵足够高，
 *    不需要慢哈希；而且需要按摘要直接走唯一索引查询。
 *  - 一次性：改密成功后写 usedAt；重放会被拒绝。
 *  - 时限：默认 1 小时。
 *  - 改密后作废同用户其余未使用令牌，避免旧链接继续可用。
 */
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** 令牌有效期（分钟）。 */
export const RESET_TOKEN_TTL_MINUTES = 60;

/** 同一账号在窗口内最多可请求几次重置邮件（防刷）。 */
export const RESET_REQUEST_LIMIT = 3;
export const RESET_REQUEST_WINDOW_MINUTES = 15;

/** 生成原始令牌：64 个十六进制字符（256 bit）。 */
export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

/** 落库前的摘要。 */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 是否已触发发送频率限制（按账号维度）。 */
export async function isResetRateLimited(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - RESET_REQUEST_WINDOW_MINUTES * 60_000);
  const recent = await prisma.passwordResetToken.count({
    where: { userId, createdAt: { gte: since } },
  });
  return recent >= RESET_REQUEST_LIMIT;
}

/** 作废该用户所有尚未使用的令牌，返回作废条数。 */
export async function invalidateUserResetTokens(userId: string): Promise<number> {
  const res = await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
  return res.count;
}

export type ValidResetToken = {
  id: string;
  userId: string;
  user: { id: string; email: string; name: string | null };
};

/**
 * 按原始令牌查找一条**仍然有效**的记录。
 * 不存在 / 已使用 / 已过期，一律返回 null（调用方不应区分，避免泄露信息）。
 */
export async function findValidResetToken(
  token: string
): Promise<ValidResetToken | null> {
  // 先做格式校验，避免把任意字符串丢进数据库查询
  if (!token || !/^[0-9a-f]{64}$/i.test(token)) return null;

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;

  return { id: record.id, userId: record.userId, user: record.user };
}

/**
 * 清理历史令牌（已过期或已使用超过 24 小时的记录）。
 * 由调用方 fire-and-forget 触发，失败不影响主流程。
 */
export async function pruneStaleResetTokens(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.passwordResetToken.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: cutoff } }, { usedAt: { lt: cutoff } }],
    },
  });
}
