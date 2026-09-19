import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { encryptSecret } from "@/lib/secrets";

// Keys safe to expose publicly (also used by the container healthcheck)
const PUBLIC_KEYS = new Set([
  "site_title",
  "site_description",
  "guild_name",
  "guild_chinese_name",
  "guild_server",
  "guild_faction",
  "kook_invite_url",
  "wechat_qr_image",
  "recruitment_status",
  "officer_emails",
]);

// Placeholder shown in the UI — never persist this over the real secret
const MASKED = "********";

export async function GET() {
  try {
    const rows = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of rows) {
      if (PUBLIC_KEYS.has(s.key)) map[s.key] = s.value;
    }
    return NextResponse.json({ settings: map });
  } catch (error) {
    console.error("Settings GET:", error);
    return NextResponse.json({ error: "获取设置失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.id || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "仅管理员可修改设置" }, { status: 403 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const entries = Object.entries(body).filter(
      ([, value]) => String(value ?? "") !== MASKED
    );

    if (entries.length === 0) {
      return NextResponse.json({ success: true });
    }

    await prisma.$transaction(
      entries.map(([key, value]) => {
        // Secrets are encrypted at rest. An empty string is a deliberate
        // "clear this value" and is stored as-is; the masked placeholder
        // "********" was already filtered out above so it can never
        // overwrite a real secret.
        let stored = String(value ?? "");
        if (key === "smtp_pass" && stored) {
          stored = encryptSecret(stored);
        }
        return prisma.setting.upsert({
          where: { key },
          update: { value: stored },
          create: { key, value: stored },
        });
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings POST:", error);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}