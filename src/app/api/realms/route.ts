import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isMemberOrAboveRole } from "@/lib/roles";
import { searchRealms } from "@/lib/realms";

/**
 * 服务器字典查询（公会成员及以上）。
 *
 * 供其它功能做「中文名 ↔ 英文 slug」换算与自动补全，例如：
 *   /api/realms?q=燃烧      -> 燃烧之刃 / burning-blade
 *   /api/realms?q=deathwing -> 死亡之翼 / deathwing
 *
 * 单独开这个接口而不是让各处直接查库，是为了统一过滤与限流之后的扩展点。
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id || !isMemberOrAboveRole(user.role)) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const q = new URL(req.url).searchParams.get("q") ?? "";
    const realms = await searchRealms(q, 20);

    return NextResponse.json({
      realms: realms.map((r) => ({
        name: r.name,
        slug: r.slug,
        category: r.category,
        typeName: r.typeName,
      })),
    });
  } catch (error) {
    console.error("[realms] GET:", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
