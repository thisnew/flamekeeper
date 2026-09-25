import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { WTF_MAX_ACCOUNTS, WTF_MAX_CHARACTERS } from "@/lib/wtf";

/** 名称类字段的统一清洗：去空白、去控制字符、限长。 */
function cleanName(v: unknown, max = 64): string {
  if (typeof v !== "string") return "";
  // 控制字符（含 \r\n\t）一律剔除，避免污染展示与导出
  return v.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

type IncomingAccount = {
  accountName?: unknown;
  characters?: unknown;
};

/** 当前用户的 WTF 账号与角色（个人中心用）。 */
export async function GET() {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const [accounts, characters] = await Promise.all([
      prisma.wtfAccount.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: { accountName: true, realmCount: true },
      }),
      prisma.character.findMany({
        where: { userId: user.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          server: true,
          accountName: true,
          sortOrder: true,
        },
      }),
    ]);

    return NextResponse.json({ accounts, characters });
  } catch (error) {
    console.error("[profile/wtf] GET:", error);
    return NextResponse.json({ error: "获取角色失败" }, { status: 500 });
  }
}

/**
 * 导入 WTF 解析结果。
 *
 * 客户端已完成「超过 1000KB 跳过 / 扩展名白名单」过滤，
 * 这里只负责：清洗名称、校验配额、落库去重。
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const incoming: IncomingAccount[] = Array.isArray(body.accounts) ? body.accounts : [];
    if (incoming.length === 0) {
      return NextResponse.json({ error: "没有可导入的账号" }, { status: 400 });
    }

    // ---- 配额：账号数 ----
    const existingAccounts = await prisma.wtfAccount.findMany({
      where: { userId: user.id },
      select: { accountName: true },
    });
    const existingNames = new Set(existingAccounts.map((a) => a.accountName));

    const newNames = incoming
      .map((a) => cleanName(a.accountName))
      .filter((n) => n && !existingNames.has(n));
    const uniqueNewNames = [...new Set(newNames)];

    if (existingNames.size + uniqueNewNames.length > WTF_MAX_ACCOUNTS) {
      return NextResponse.json(
        {
          error: `最多只能保存 ${WTF_MAX_ACCOUNTS} 个 WTF 账号。你已有 ${existingNames.size} 个，本次新增 ${uniqueNewNames.length} 个。`,
        },
        { status: 400 }
      );
    }

    // ---- 配额：角色数 ----
    const existingChars = await prisma.character.findMany({
      where: { userId: user.id },
      select: { name: true, server: true, sortOrder: true },
    });
    const existingCharKeys = new Set(existingChars.map((c) => `${c.server}/${c.name}`));

    // 收集本次要新增的角色（跨账号去重 + 与已有去重）
    const toCreate: { name: string; server: string; accountName: string }[] = [];
    const seen = new Set<string>();

    for (const acc of incoming) {
      const accountName = cleanName(acc.accountName);
      if (!accountName) continue;
      const chars = Array.isArray(acc.characters) ? acc.characters : [];
      for (const raw of chars) {
        const c = raw as { name?: unknown; realm?: unknown };
        const name = cleanName(c?.name, 32);
        const realm = cleanName(c?.realm, 32);
        if (!name || !realm) continue;
        const key = `${realm}/${name}`;
        if (existingCharKeys.has(key) || seen.has(key)) continue;
        seen.add(key);
        toCreate.push({ name, server: realm, accountName });
      }
    }

    if (existingChars.length + toCreate.length > WTF_MAX_CHARACTERS) {
      return NextResponse.json(
        {
          error: `最多只能保存 ${WTF_MAX_CHARACTERS} 个角色。你已有 ${existingChars.length} 个，本次新增 ${toCreate.length} 个。请少选一些。`,
        },
        { status: 400 }
      );
    }

    // 排序号从已有的最大值往后排
    let nextOrder = existingChars.reduce((m, c) => Math.max(m, c.sortOrder), -1) + 1;

    const result = await prisma.$transaction(async (tx) => {
      for (const acc of incoming) {
        const accountName = cleanName(acc.accountName);
        if (!accountName) continue;
        const chars = Array.isArray(acc.characters) ? acc.characters : [];
        const realms = new Set(
          chars
            .map((raw) => cleanName((raw as { realm?: unknown })?.realm, 32))
            .filter(Boolean)
        );

        await tx.wtfAccount.upsert({
          where: { userId_accountName: { userId: user.id, accountName } },
          update: { realmCount: realms.size },
          create: { userId: user.id, accountName, realmCount: realms.size },
        });
      }

      let created = 0;
      for (const c of toCreate) {
        await tx.character.create({
          data: {
            userId: user.id,
            name: c.name,
            server: c.server,
            accountName: c.accountName,
            sortOrder: nextOrder++,
            isPublic: true,
          },
        });
        created++;
      }
      return { created, accounts: uniqueNewNames.length };
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "WTF_IMPORT",
        detail: `导入 WTF：新增账号 ${result.accounts} 个、角色 ${result.created} 个`,
      },
    });

    return NextResponse.json({
      success: true,
      createdCharacters: result.created,
      newAccounts: result.accounts,
      message: `已导入 ${result.created} 个角色${
        result.accounts ? `、${result.accounts} 个账号` : ""
      }`,
    });
  } catch (error) {
    console.error("[profile/wtf] POST:", error);
    return NextResponse.json({ error: "导入失败，请稍后再试" }, { status: 500 });
  }
}

/**
 * 删除一个 WTF 账号及其名下的所有角色。
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const accountName = new URL(req.url).searchParams.get("accountName");
    if (!accountName) {
      return NextResponse.json({ error: "缺少 accountName" }, { status: 400 });
    }

    const owned = await prisma.wtfAccount.findUnique({
      where: { userId_accountName: { userId: user.id, accountName } },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "账号不存在" }, { status: 404 });
    }

    const res = await prisma.$transaction(async (tx) => {
      const delChars = await tx.character.deleteMany({
        where: { userId: user.id, accountName },
      });
      await tx.wtfAccount.delete({ where: { id: owned.id } });
      return delChars.count;
    });

    return NextResponse.json({
      success: true,
      deletedCharacters: res,
      message: `已移除账号 ${accountName} 及其 ${res} 个角色`,
    });
  } catch (error) {
    console.error("[profile/wtf] DELETE:", error);
    return NextResponse.json({ error: "删除失败，请稍后再试" }, { status: 500 });
  }
}
