import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdminRole, isOfficerOrAboveRole } from "@/lib/roles";
import {
  BLIZZARD_CN_REALM_URL,
  fetchBlizzardCnRealms,
  getRealmSyncInfo,
  syncRealms,
} from "@/lib/realms";

/** 同步状态 + 服务器列表（官员可看）。 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id || !isOfficerOrAboveRole(user.role)) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const q = new URL(req.url).searchParams.get("q")?.trim() || "";
    const info = await getRealmSyncInfo();

    // 列表按需返回：搜索时最多 100 条，否则给前 200 条够后台翻看
    const list = await prisma.gameRealm.findMany({
      where: q
        ? { OR: [{ name: { contains: q } }, { slug: { contains: q.toLowerCase() } }] }
        : undefined,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      take: 200,
      select: {
        name: true,
        slug: true,
        category: true,
        typeName: true,
        populationName: true,
        statusName: true,
      },
    });

    return NextResponse.json({
      ...info,
      source: BLIZZARD_CN_REALM_URL,
      realms: list,
      truncated: info.total > list.length,
    });
  } catch (error) {
    console.error("[admin/realms] GET:", error);
    return NextResponse.json({ error: "获取服务器数据失败" }, { status: 500 });
  }
}

/**
 * 手动触发同步（仅管理员）。
 *
 * 为什么不做成定时任务：需求是「管理员手动定期更新」——
 * 暴雪接口的结构与可用性都不由我们控制，自动跑失败只会静默堆积错误日志；
 * 由管理员点按钮，成功失败都能即时看到原因。
 */
export async function POST() {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "仅管理员可更新服务器数据" }, { status: 403 });
    }

    const fetched = await fetchBlizzardCnRealms();
    if (!fetched.ok) {
      // 保持原数据不动 —— 抓取失败不该把已有字典清掉
      return NextResponse.json({ error: fetched.error }, { status: 502 });
    }

    const result = await syncRealms(fetched.realms);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REALM_SYNC",
        detail: `更新国服服务器数据：新增 ${result.created}、更新 ${result.updated}、共 ${result.total} 条`,
      },
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: `已更新 ${result.total} 个服务器（新增 ${result.created}，更新 ${result.updated}）`,
    });
  } catch (error) {
    console.error("[admin/realms] POST:", error);
    return NextResponse.json({ error: "更新失败，请稍后再试" }, { status: 500 });
  }
}
