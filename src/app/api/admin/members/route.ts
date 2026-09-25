import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdminRole, isOfficerOrAboveRole } from "@/lib/roles";
import { guildRankLabel, isGuildRank } from "@/lib/guild-rank";

/**
 * 判断把 `userId` 的引荐人设为 `newReferrerId` 是否会形成环。
 *
 * 为什么必须拦：引荐关系是一棵树，而「结构图」是递归渲染的。
 * 一旦 A 引荐 B 且 B 引荐 A，渲染会**无限递归**，页面直接挂掉。
 *
 * 做法：从新引荐人沿 referredById 往上走；遇到 userId 就说明 userId
 * 已经是它的祖先，再连过去就成环。`seen` 同时兜住历史数据里可能
 * 已经存在的环（保守地直接拒绝，而不是死循环）。
 */
async function wouldCreateCycle(userId: string, newReferrerId: string): Promise<boolean> {
  if (userId === newReferrerId) return true;

  const seen = new Set<string>();
  let current: string | null = newReferrerId;
  let hops = 0;

  while (current) {
    if (current === userId) return true;
    if (seen.has(current)) return true; // 已有环，拒绝继续
    seen.add(current);

    // 保护：异常数据下也不要无限循环
    if (++hops > 1000) return true;

    const row: { referredById: string | null } | null = await prisma.user.findUnique({
      where: { id: current },
      select: { referredById: true },
    });
    current = row?.referredById ?? null;
  }

  return false;
}

/** 成员列表（官员及以上可查看）。 */
export async function GET() {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id || !isOfficerOrAboveRole(user.role)) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const members = await prisma.user.findMany({
      where: { status: "APPROVED" },
      orderBy: [{ guildRank: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        guildRank: true,
        referredById: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error("[admin/members] GET:", error);
    return NextResponse.json({ error: "获取成员列表失败" }, { status: 500 });
  }
}

/**
 * 调整成员的会阶 / 引荐人。
 *
 * 仅管理员 —— 这是结构性变更（改的是成员之间的上下级关系），
 * 与「官员可以审批入会」不是同一层级的权力。
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const actor = session?.user as any;
    if (!actor?.id || !isAdminRole(actor.role)) {
      return NextResponse.json({ error: "仅管理员可调整会阶与引荐关系" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) return NextResponse.json({ error: "缺少 userId" }, { status: 400 });

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, guildRank: true, referredById: true },
    });
    if (!target) return NextResponse.json({ error: "成员不存在" }, { status: 404 });

    const data: Record<string, unknown> = {};
    const changes: string[] = [];

    // ---- 会阶 ----
    if (body.guildRank !== undefined) {
      if (!isGuildRank(body.guildRank)) {
        return NextResponse.json({ error: "会阶取值非法" }, { status: 400 });
      }
      data.guildRank = body.guildRank;
      changes.push(`会阶 ${guildRankLabel(target.guildRank)} → ${guildRankLabel(body.guildRank)}`);
    }

    // ---- 引荐人 ----
    if (body.referredById !== undefined) {
      const next = body.referredById === null || body.referredById === "" ? null : String(body.referredById);

      if (next === userId) {
        return NextResponse.json({ error: "不能把自己设为引荐人" }, { status: 400 });
      }

      if (next) {
        const referrer = await prisma.user.findUnique({
          where: { id: next },
          select: { id: true, name: true, email: true },
        });
        if (!referrer) {
          return NextResponse.json({ error: "指定的引荐人不存在" }, { status: 404 });
        }
        // ★ 关键校验：不能造出环，否则结构图会无限递归
        if (await wouldCreateCycle(userId, next)) {
          return NextResponse.json(
            { error: "该调整会形成循环引荐关系（例如 A 引荐 B 又让 B 引荐 A），已拒绝" },
            { status: 400 }
          );
        }
      }

      data.referredById = next;
      changes.push(
        `引荐人 ${target.referredById ?? "无"} → ${next ?? "无"}`
      );
    }

    if (changes.length === 0) {
      return NextResponse.json({ error: "没有需要更新的字段" }, { status: 400 });
    }

    await prisma.user.update({ where: { id: userId }, data });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: "MEMBER_UPDATE",
        detail: `调整 ${target.name || target.email}：${changes.join("；")}`,
      },
    });

    return NextResponse.json({ success: true, message: "已更新", changes });
  } catch (error) {
    console.error("[admin/members] PATCH:", error);
    return NextResponse.json({ error: "更新失败，请稍后再试" }, { status: 500 });
  }
}
