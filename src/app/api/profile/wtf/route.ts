import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  WTF_MAX_ACCOUNTS,
  WTF_MAX_CHARACTERS,
  WTF_MAX_FILE_BYTES,
  isAllowedWtfFile,
} from "@/lib/wtf";
import {
  WTF_MAX_TOTAL_BYTES,
  listWtfFiles,
  removeAccountFiles,
  safeStoragePath,
  saveWtfFile,
} from "@/lib/wtf-storage";
import { canonicalRealmSlug, matchGuildMembersBulk } from "@/lib/raiderio";
import { canonicalRealmName } from "@/lib/realms";
import { getWtfSummary } from "@/lib/wtf-summary";

/** 名称类字段的统一清洗：去空白、去控制字符、限长。 */
function cleanName(v: unknown, max = 64): string {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

/** 当前用户已保存的 WTF 账号、角色与文件清单。 */
export async function GET() {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    // 与个人中心的**服务端组件共用一个函数**，避免两边取到不一样的数据
    const summary = await getWtfSummary(user.id);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[profile/wtf] GET:", error);
    return NextResponse.json({ error: "获取角色失败" }, { status: 500 });
  }
}

/**
 * 导入。支持两种模式，按请求的 Content-Type 区分：
 *
 * ① **备份模式**（`multipart/form-data`）—— 按目前流程：
 *      files[]     要保存的文件（前端已按 >1000KB / 扩展名 过滤，服务端再验一遍）
 *      characters  JSON 字符串：勾选要录入的角色 [{accountName, realm, name}]
 *    文件落盘到私有存储，角色按勾选建档。
 *
 * ② **仅检索模式**（`application/json`，body `{ characters: [...] }`）——
 *    只比对公会名单并建角色，**完全不收文件**。
 *
 *    为什么是「不上传」而不是「上传后清理」：
 *      - 提取角色只需要**目录名**，文件内容本来是多余的 ——
 *        WTF 动辄几十 MB，传上去纯属浪费上行带宽与时间
 *      - 上传后再删存在失败窗口：删不掉就残留，还得靠清理任务兜底
 *    所以「不传」既更省也更简单，没有理由先传再删。
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const contentType = req.headers.get("content-type") || "";
    const retrieveOnly = contentType.includes("application/json");

    let rawFiles: File[] = [];
    let selectedRaw: unknown = [];

    if (retrieveOnly) {
      // ---- 仅检索：没有文件 ----
      const body = await req.json().catch(() => ({}));
      selectedRaw = body?.characters;
    } else {
      // ---- 备份：multipart ----
      let form: FormData;
      try {
        form = await req.formData();
      } catch {
        return NextResponse.json(
          { error: "请求格式不正确（需要 multipart/form-data 或 application/json）" },
          { status: 400 }
        );
      }
      rawFiles = form.getAll("files").filter((f): f is File => f instanceof File);
      if (rawFiles.length === 0) {
        return NextResponse.json({ error: "没有收到任何文件" }, { status: 400 });
      }
      try {
        selectedRaw = JSON.parse(String(form.get("characters") || "[]"));
      } catch {
        return NextResponse.json({ error: "characters 不是合法 JSON" }, { status: 400 });
      }
    }

    let selected: { accountName: string; realm: string; name: string }[] = [];
    if (Array.isArray(selectedRaw)) {
      selected = (selectedRaw as any[])
        .map((c) => ({
          accountName: cleanName(c?.accountName),
          realm: cleanName(c?.realm, 32),
          name: cleanName(c?.name, 32),
        }))
        .filter((c) => c.realm && c.name);
    }
    if (selected.length === 0) {
      return NextResponse.json({ error: "没有选择任何角色" }, { status: 400 });
    }

    // ---- 与 Raider.IO 公会名单比对（严格）----
    //
    // 只有公会名单里的角色才允许导入：非公会角色**不上传文件、不建记录**。
    // 服务器两侧都经 canonicalRealmSlug 归一（WTF 的中文名 vs API 的英文 Title），
    // 所以「回音山」能和「Echo Ridge」对上。
    const memberIdByKey = await matchGuildMembersBulk(
      selected.map((c) => ({ realm: c.realm, name: c.name }))
    );

    const guildCharacters = selected.filter((c) =>
      memberIdByKey.has(`${c.realm}/${c.name}`)
    );
    const ignoredCount = selected.length - guildCharacters.length;

    if (guildCharacters.length === 0) {
      return NextResponse.json(
        {
          error:
            `所选 ${selected.length} 个角色都不在公会名单中，无法导入。` +
            "请确认角色属于本公会（服务器与角色名需与 Raider.IO 名单一致），" +
            "或先让管理员到「后台 → 公会数据更新」导入公会成员名单。",
        },
        { status: 400 }
      );
    }

    // 允许落盘的角色（账号/服务器slug/角色名小写）
    const allowedCharacters = new Set<string>();
    const allowedAccounts = new Set<string>();
    for (const c of guildCharacters) {
      const realmSlug = await canonicalRealmSlug(c.realm);
      allowedCharacters.add(`${c.accountName}/${realmSlug}/${c.name.toLowerCase()}`);
      allowedAccounts.add(c.accountName);
    }

    /** 账号级的保留目录（`Account/<账号>/SavedVariables/…`）。 */
    const ACCOUNT_LEVEL_DIRS = new Set([
      "savedvariables",
      "wtf",
      "cache",
      "logs",
      "errors",
    ]);

    /**
     * 这个存储路径是否属于「已选中且是公会成员」的角色？
     *
     * 归一化后的结构是 `<账号>/<服务器>/<角色>/…`。
     * ⚠ 路径里的服务器段是**原始写法**（WTF 里是中文「回音山」），
     *   而白名单键是归一化后的 slug（echo-ridge）—— 必须也归一化一次再比，
     *   否则公会角色自己的文件会被全部跳过（这个坑踩过）。
     *
     *   - 第二段是 SavedVariables 等 → 账号级文件，只要该账号有导入的角色就保留
     *   - 否则第二、三段必须命中 allowedCharacters
     */
    const realmSlugCache = new Map<string, string>();
    async function pathRealmSlug(raw: string): Promise<string> {
      const key = raw.toLowerCase();
      const hit = realmSlugCache.get(key);
      if (hit) return hit;
      const slug = await canonicalRealmSlug(raw);
      realmSlugCache.set(key, slug);
      return slug;
    }

    async function isAllowedPath(storagePath: string): Promise<boolean> {
      const parts = storagePath.split("/");
      if (parts.length < 2) return false;
      const account = parts[0];
      if (!allowedAccounts.has(account)) return false;

      const seg1 = parts[1] ?? "";
      if (ACCOUNT_LEVEL_DIRS.has(seg1.toLowerCase())) return true;

      if (parts.length < 3) return false;
      const seg1Slug = await pathRealmSlug(seg1);
      return allowedCharacters.has(`${account}/${seg1Slug}/${parts[2].toLowerCase()}`);
    }

    // 服务端独立再验一道：类型与大小不能只信前端
    const skipped = { badExtension: 0, tooLarge: 0, badPath: 0, notGuildMember: 0 };
    const toWrite: { storagePath: string; buffer: Buffer }[] = [];
    let total = 0;

    for (const f of rawFiles) {
      const relPath = (f as any).webkitRelativePath || f.name || "";
      const filename = relPath.replace(/\\/g, "/").split("/").pop() ?? f.name;

      if (!isAllowedWtfFile(filename)) {
        skipped.badExtension++;
        continue;
      }
      if (f.size > WTF_MAX_FILE_BYTES) {
        skipped.tooLarge++;
        continue;
      }

      const storagePath = safeStoragePath(relPath);
      if (!storagePath) {
        skipped.badPath++;
        continue;
      }
      // ★ 只保存公会成员角色的文件
      if (!(await isAllowedPath(storagePath))) {
        skipped.notGuildMember++;
        continue;
      }

      total += f.size;
      if (total > WTF_MAX_TOTAL_BYTES) {
        return NextResponse.json(
          {
            error: `本次上传超过 ${Math.round(
              WTF_MAX_TOTAL_BYTES / 1024 / 1024
            )} MB 上限，请分账号多次上传`,
          },
          { status: 413 }
        );
      }

      toWrite.push({ storagePath, buffer: Buffer.from(await f.arrayBuffer()) });
    }

    // 仅检索模式收不到文件（rawFiles 为空），上面的循环天然空转，
    // 所以这里只在备份模式下要求「确实有文件要存」。
    if (!retrieveOnly && toWrite.length === 0) {
      return NextResponse.json(
        {
          error: `没有可保存的文件（扩展名不符 ${skipped.badExtension}，超过 1000KB ${skipped.tooLarge}，路径非法 ${skipped.badPath}）`,
        },
        { status: 400 }
      );
    }

    // ---- 配额头一道：账号 ----
    const existingAccounts = await prisma.wtfAccount.findMany({
      where: { userId: user.id },
      select: { accountName: true },
    });
    const existingNames = new Set(existingAccounts.map((a) => a.accountName));

    const accountsInUpload = [
      ...new Set(toWrite.map((w) => w.storagePath.split("/")[0]).filter(Boolean)),
    ];
    const newAccountNames = accountsInUpload.filter((n) => !existingNames.has(n));

    if (existingNames.size + newAccountNames.length > WTF_MAX_ACCOUNTS) {
      return NextResponse.json(
        {
          error: `最多保存 ${WTF_MAX_ACCOUNTS} 个 WTF 账号。你已有 ${existingNames.size} 个，本次涉及 ${newAccountNames.length} 个新账号。`,
        },
        { status: 400 }
      );
    }

    // ---- 配额头二道：角色 ----
    const existingChars = await prisma.character.findMany({
      where: { userId: user.id },
      select: { name: true, server: true, sortOrder: true },
    });
    const existingCharKeys = new Set(existingChars.map((c) => `${c.server}/${c.name}`));

    // 服务器名归一到**字典里的中文规范名**。
    // `Character` 有 @@unique([server, name])，若这里写「回音山」而别处写
    // "Echo Ridge"，唯一约束就会被绕过 —— 归一之后才真正唯一。
    const normalized = await Promise.all(
      guildCharacters.map(async (c) => ({
        ...c,
        server: await canonicalRealmName(c.realm),
      }))
    );

    // ---- 全站唯一：别人已经认领的同名角色 ----
    // 一个魔兽角色在游戏里只属于一个人，两个人各自认领同一个会重复统计、也给冒充留口子。
    const takenRows = normalized.length
      ? await prisma.character.findMany({
          where: {
            userId: { not: user.id },
            OR: normalized.map((c) => ({ server: c.server, name: c.name })),
          },
          select: {
            server: true,
            name: true,
            user: { select: { name: true, email: true } },
          },
        })
      : [];
    const takenBy = new Map(
      takenRows.map((r) => [
        `${r.server}/${r.name}`,
        r.user?.name || r.user?.email || "其他成员",
      ])
    );

    const charsToCreate: {
      name: string;
      server: string;
      accountName: string;
      guildMemberId: string;
    }[] = [];
    const conflicts: { name: string; server: string; owner: string }[] = [];
    const seen = new Set<string>();
    // 只处理通过公会比对的角色（非公会角色在上一步已被拦掉）
    for (const c of normalized) {
      const guildKey = `${c.realm}/${c.name}`;
      const key = `${c.server}/${c.name}`;
      if (existingCharKeys.has(key) || seen.has(key)) continue;
      const owner = takenBy.get(key);
      if (owner) {
        conflicts.push({ name: c.name, server: c.server, owner });
        continue;
      }
      seen.add(key);
      charsToCreate.push({
        name: c.name,
        server: c.server,
        accountName: c.accountName,
        guildMemberId: memberIdByKey.get(guildKey)!,
      });
    }

    // 全部被人占了 —— 说清楚是谁占的，别让人以为「导入坏了」
    if (charsToCreate.length === 0 && conflicts.length > 0) {
      return NextResponse.json(
        {
          error:
            `所选角色都已被其他成员认领，无法重复绑定：` +
            conflicts
              .map((c) => `${c.name}@${c.server}（${c.owner}）`)
              .join("、") +
            "。若确实是你本人的角色，请联系官员处理。",
          conflicts,
        },
        { status: 409 }
      );
    }

    if (existingChars.length + charsToCreate.length > WTF_MAX_CHARACTERS) {
      return NextResponse.json(
        {
          error: `最多保存 ${WTF_MAX_CHARACTERS} 个角色。你已有 ${existingChars.length} 个，本次新增 ${charsToCreate.length} 个，请少选一些。`,
        },
        { status: 400 }
      );
    }

    // ---- 落盘 ----
    let savedBytes = 0;
    let savedFiles = 0;
    for (const w of toWrite) {
      savedBytes += await saveWtfFile(user.id, w.storagePath, w.buffer);
      savedFiles++;
    }

    // ---- 建档 ----
    let nextOrder = existingChars.reduce((m, c) => Math.max(m, c.sortOrder), -1) + 1;

    const result = await prisma.$transaction(async (tx) => {
      for (const accountName of accountsInUpload) {
        // 该账号下出现了几个服务器（服务器位要排除 SavedVariables 等账号级目录）
        const realms = new Set(
          toWrite
            .map((w) => w.storagePath.split("/"))
            .filter((parts) => parts[0] === accountName && parts.length >= 3)
            .map((parts) => parts[1])
            .filter((r) => r && r.toLowerCase() !== "savedvariables")
        );
        await tx.wtfAccount.upsert({
          where: { userId_accountName: { userId: user.id, accountName } },
          update: { realmCount: realms.size },
          create: { userId: user.id, accountName, realmCount: realms.size },
        });
      }

      let created = 0;
      for (const c of charsToCreate) {
        await tx.character.create({
          data: {
            userId: user.id,
            name: c.name,
            server: c.server,
            accountName: c.accountName,
            // 绑定到公会成员记录 —— 「是公会成员」由此判定
            guildMemberId: c.guildMemberId,
            sortOrder: nextOrder++,
            isPublic: true,
          },
        });
        created++;
      }
      return { created };
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "WTF_IMPORT",
        detail: retrieveOnly
          ? `WTF 仅检索（未存文件）：录入公会角色 ${result.created} 个${
              ignoredCount > 0 ? `，忽略 ${ignoredCount} 个非公会角色` : ""
            }`
          : `上传 WTF：保存 ${savedFiles} 个文件（${Math.round(
              savedBytes / 1024
            )} KB），新增账号 ${newAccountNames.length} 个、公会角色 ${result.created} 个${
              ignoredCount > 0 ? `，忽略 ${ignoredCount} 个非公会角色` : ""
            }`,
      },
    });

    return NextResponse.json({
      success: true,
      retrieveOnly,
      savedFiles,
      savedBytes,
      createdCharacters: result.created,
      newAccounts: newAccountNames.length,
      ignoredCharacters: ignoredCount,
      /** 被其他成员认领、因而未导入的角色 */
      conflicts,
      skipped,
      message:
        (retrieveOnly
          ? `仅检索：录入 ${result.created} 个公会角色，**未在服务器保留任何文件**`
          : `已备份 ${savedFiles} 个文件，录入 ${result.created} 个公会角色`) +
        (ignoredCount > 0 ? `（忽略 ${ignoredCount} 个非公会角色）` : "") +
        (conflicts.length > 0
          ? `（${conflicts.length} 个角色已被他人认领，未导入）`
          : ""),
    });
  } catch (error) {
    console.error("[profile/wtf] POST:", error);
    return NextResponse.json({ error: "导入失败，请稍后再试" }, { status: 500 });
  }
}

/** 删除一个 WTF 账号：连同磁盘文件与角色记录。 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const accountName = new URL(req.url).searchParams.get("accountName");
    if (!accountName) {
      return NextResponse.json({ error: "缺少 accountName" }, { status: 400 });
    }

    const owned = await prisma.wtfAccount.findUnique({
      where: { userId_accountName: { userId: user.id, accountName } },
      select: { id: true },
    });
    if (!owned) return NextResponse.json({ error: "账号不存在" }, { status: 404 });

    // 先删磁盘文件，再删数据库记录
    const deletedFiles = await removeAccountFiles(user.id, accountName);

    const deletedChars = await prisma.$transaction(async (tx) => {
      const res = await tx.character.deleteMany({ where: { userId: user.id, accountName } });
      await tx.wtfAccount.delete({ where: { id: owned.id } });
      return res.count;
    });

    return NextResponse.json({
      success: true,
      deletedCharacters: deletedChars,
      deletedFiles,
      message: `已移除账号 ${accountName}：${deletedFiles} 个文件、${deletedChars} 个角色`,
    });
  } catch (error) {
    console.error("[profile/wtf] DELETE:", error);
    return NextResponse.json({ error: "删除失败，请稍后再试" }, { status: 500 });
  }
}
