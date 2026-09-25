import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isMemberOrAboveRole } from "@/lib/roles";
import { matchGuildMembersBulk } from "@/lib/raiderio";

/**
 * 批量比对：哪些角色属于**公会名单**。
 *
 * WTF 导入界面用它过滤 —— 严格模式下非公会角色根本不展示、不上传。
 * 放在服务端比对而不是让前端自己判断，是因为服务器名的中英对齐
 * （回音山 ↔ "Echo Ridge"）依赖服务器字典，前端拿不到。
 *
 * 只读本地 GuildMember 表，**不会**调用 Raider.IO。
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id || !isMemberOrAboveRole(user.role)) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const raw: unknown = body.characters;
    if (!Array.isArray(raw)) {
      return NextResponse.json({ error: "characters 必须是数组" }, { status: 400 });
    }
    // 防止一次塞太多把库压垮
    const items = raw
      .slice(0, 500)
      .map((c: any) => ({
        realm: String(c?.realm ?? "").trim().slice(0, 64),
        name: String(c?.name ?? "").trim().slice(0, 32),
      }))
      .filter((c) => c.realm && c.name);

    const matched = await matchGuildMembersBulk(items);

    // 回传「哪几个命中」，键与前端一致：`${realm}/${name}`
    const guildKeys: string[] = [];
    for (const item of items) {
      if (matched.has(`${item.realm}/${item.name}`)) {
        guildKeys.push(`${item.realm}/${item.name}`);
      }
    }

    return NextResponse.json({ total: items.length, matched: guildKeys.length, guildKeys });
  } catch (error) {
    console.error("[guild/match] POST:", error);
    return NextResponse.json({ error: "比对失败" }, { status: 500 });
  }
}
