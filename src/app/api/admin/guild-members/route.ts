import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdminRole, isOfficerOrAboveRole } from "@/lib/roles";
import { encryptSecret, isEncrypted } from "@/lib/secrets";
import { maskEmail } from "@/lib/privacy";
import {
  RIO_DEFAULTS,
  RIO_SETTING_KEYS,
  fetchGuildMembers,
  getRioConfig,
  getRioSyncInfo,
  recordRioError,
  syncGuildMembers,
} from "@/lib/raiderio";

/** 配置与同步状态（官员可看，access_key 只回掩码）。 */
export async function GET() {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id || !isOfficerOrAboveRole(user.role)) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const [cfg, info, sample] = await Promise.all([
      getRioConfig(),
      getRioSyncInfo(),
      prisma.guildMember.findMany({
        orderBy: [{ rank: "asc" }, { characterName: "asc" }],
        take: 200,
        select: {
          id: true,
          characterName: true,
          realmTitle: true,
          realmSlug: true,
          className: true,
          specName: true,
          specRole: true,
          rank: true,
          // 绑定了站内角色 = 该成员已在站内「验证」过
          characters: {
            where: { isPublic: true },
            select: {
              id: true,
              isMain: true,
              user: {
                select: { id: true, name: true, email: true, guildRank: true, role: true },
              },
            },
          },
        },
      }),
    ]);

    // Raider.IO 返回的服务器是**英文 Title**（"Echo Ridge"），中文用户看的是
    // 字典表里的 name（"回音山"）。用归一化后的 slug 反查一次，别在页面上显示英文。
    const realmSlugs = [...new Set(sample.map((m) => m.realmSlug))];
    const realmRows = realmSlugs.length
      ? await prisma.gameRealm.findMany({
          where: { slug: { in: realmSlugs } },
          select: { slug: true, name: true },
        })
      : [];
    const realmNameBySlug = new Map(realmRows.map((r) => [r.slug, r.name]));

    return NextResponse.json({
      config: {
        region: cfg.region,
        realm: cfg.realm,
        guildName: cfg.guildName,
        // 绝不回传真实密钥；只告诉前端「已配置」
        accessKeySet: !!cfg.accessKey,
      },
      ...info,
      // 标记：绑定了站内用户 = 已验证；否则 = 未绑定用户
      members: sample.map((m) => {
        const bound = m.characters.find((c) => c.isMain) ?? m.characters[0] ?? null;
        return {
          id: m.id,
          characterName: m.characterName,
          realmTitle: m.realmTitle,
          /** 中文服务器名（字典表），查不到时回退英文 Title */
          realmName: realmNameBySlug.get(m.realmSlug) ?? m.realmTitle,
          className: m.className,
          specName: m.specName,
          specRole: m.specRole,
          rank: m.rank,
          /** 已经过 WTF 验证并绑定到站内用户 */
          verified: m.characters.length > 0,
          /** 名下挂了几个站内角色 */
          boundCount: m.characters.length,
          /** 主力角色（若有）—— 展示时优先 */
          isMain: bound?.isMain ?? false,
          user: bound?.user
            ? {
                name: bound.user.name,
                email: maskEmail(bound.user.email),
                guildRank: bound.user.guildRank,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error("[admin/guild-members] GET:", error);
    return NextResponse.json({ error: "获取公会成员数据失败" }, { status: 500 });
  }
}

/** 保存配置（仅管理员）。 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "仅管理员可修改配置" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const updates: { key: string; value: string }[] = [];

    const put = (key: string, raw: unknown, max = 64) => {
      if (raw === undefined) return;
      const v = String(raw).replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
      updates.push({ key, value: v });
    };

    put(RIO_SETTING_KEYS.region, body.region, 8);
    put(RIO_SETTING_KEYS.realm, body.realm, 64);
    put(RIO_SETTING_KEYS.guildName, body.guildName, 64);

    // access_key：空字符串表示「不改」，掩码同样跳过，非空则加密后存
    if (typeof body.accessKey === "string" && body.accessKey.trim() && body.accessKey !== "********") {
      updates.push({
        key: RIO_SETTING_KEYS.accessKey,
        value: isEncrypted(body.accessKey) ? body.accessKey : encryptSecret(body.accessKey.trim()),
      });
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "没有需要更新的字段" }, { status: 400 });
    }

    await prisma.$transaction(
      updates.map((u) =>
        prisma.setting.upsert({
          where: { key: u.key },
          update: { value: u.value },
          create: { key: u.key, value: u.value },
        })
      )
    );

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "RIO_CONFIG_UPDATE",
        detail: `更新 Raider.IO 配置：${updates.map((u) => u.key).join(", ")}`,
      },
    });

    return NextResponse.json({ success: true, message: "配置已保存" });
  } catch (error) {
    console.error("[admin/guild-members] PATCH:", error);
    return NextResponse.json({ error: "保存失败，请稍后再试" }, { status: 500 });
  }
}

/**
 * 从 Raider.IO 导入公会成员（仅管理员）。
 *
 * ⚠ 这个接口会**真实调用 Raider.IO**，有配额限制 —— 所以只由管理员手动触发，
 *   不做定时任务。抓取失败时保留原有名单不动。
 */
export async function POST() {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "仅管理员可导入公会成员" }, { status: 403 });
    }

    const cfg = await getRioConfig();
    if (!cfg.guildName) {
      return NextResponse.json({ error: "请先填写公会名与服务器" }, { status: 400 });
    }

    const fetched = await fetchGuildMembers(cfg);
    if (!fetched.ok) {
      // 失败也记下来，后台能直接看到原因
      await recordRioError(fetched.error);
      return NextResponse.json({ error: fetched.error }, { status: 502 });
    }

    const result = await syncGuildMembers(
      fetched.members,
      fetched.guildName || cfg.guildName,
      fetched.region || cfg.region
    );

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "RIO_GUILD_SYNC",
        detail: `导入公会成员（${fetched.guildName || cfg.guildName}）：新增 ${result.created}、更新 ${result.updated}、共 ${result.total} 条`,
      },
    });

    return NextResponse.json({
      success: true,
      ...result,
      guildName: fetched.guildName || cfg.guildName,
      realmTitle: fetched.realmTitle,
      region: fetched.region || cfg.region,
      message: `已导入 ${fetched.guildName || cfg.guildName} 的 ${result.total} 名成员（新增 ${result.created}，更新 ${result.updated}）`,
    });
  } catch (error) {
    console.error("[admin/guild-members] POST:", error);
    return NextResponse.json({ error: "导入失败，请稍后再试" }, { status: 500 });
  }
}
