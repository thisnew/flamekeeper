import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { sendMail, verifyMailConfig, mailShell, isMailConfigured } from "@/lib/mailer";

const MAX_RECIPIENTS = 300;

const testSchema = z.object({
  action: z.literal("test"),
  to: z.string().email().optional(),
});

const sendSchema = z.object({
  action: z.literal("send"),
  subject: z.string().min(1, "请填写邮件主题"),
  content: z.string().min(1, "请填写邮件正文"),
  roles: z.array(z.enum(["USER", "MEMBER", "OFFICER", "ADMIN"])).min(1, "请至少选择一个收件人群组"),
  onlyVerified: z.boolean().optional().default(true),
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id || !isAdminRole(user.role)) {
    return NextResponse.json({ error: "仅管理员可操作邮件服务" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  // ---- test connection / send a test mail ----
  if (body?.action === "test") {
    const parsed = testSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "参数错误" }, { status: 400 });
    }

    const conn = await verifyMailConfig();
    if (!conn.ok) {
      return NextResponse.json({ ok: false, step: "connect", error: conn.error }, { status: 502 });
    }

    if (parsed.data.to) {
      const res = await sendMail({
        to: parsed.data.to,
        subject: "【Eternal Flame】SMTP 配置测试",
        html: mailShell(
          "SMTP 配置正常",
          `<p>这是一封测试邮件，说明你的邮件服务配置可用。</p>
           <p style="font-size:13px;color:#9D9D9D;">发送时间：${new Date().toLocaleString("zh-CN")}</p>`
        ),
      });
      if (!res.ok) {
        return NextResponse.json({ ok: false, step: "send", error: res.error }, { status: 502 });
      }
    }

    return NextResponse.json({ ok: true, message: "SMTP 连接正常" + (parsed.data.to ? "，测试邮件已发送" : "") });
  }

  // ---- bulk send ----
  if (body?.action === "send") {
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "参数错误" }, { status: 400 });
    }

    if (!(await isMailConfigured())) {
      return NextResponse.json({ error: "邮件服务尚未配置（管理员 → 系统设置）" }, { status: 503 });
    }

    const { subject, content, roles, onlyVerified } = parsed.data;

    const recipients = await prisma.user.findMany({
      where: {
        role: { in: roles },
        ...(onlyVerified ? { emailVerified: { not: null } } : {}),
      },
      select: { email: true, name: true },
    });

    if (recipients.length === 0) {
      return NextResponse.json({ error: "没有符合条件的收件人" }, { status: 400 });
    }
    if (recipients.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        { error: `收件人过多（${recipients.length}），单次上限 ${MAX_RECIPIENTS} 人` },
        { status: 400 }
      );
    }

    // Render plain text (paragraphs + line breaks) into the themed shell
    const bodyHtml = content
      .split("\n")
      .map((line) => (line.trim() === "" ? "<br/>" : `<p>${escapeHtml(line)}</p>`))
      .join("");

    let sent = 0;
    const failures: Array<{ email: string; error: string }> = [];

    for (const r of recipients) {
      const res = await sendMail({
        to: r.email,
        subject,
        html: mailShell(subject, `${r.name ? `<p>${escapeHtml(r.name)}，你好：</p>` : ""}${bodyHtml}`),
        text: content,
      });
      if (res.ok) sent++;
      else failures.push({ email: r.email, error: res.error || "未知错误" });
    }

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "MAIL_BULK_SEND",
          detail: `subject="${subject}" total=${recipients.length} sent=${sent} failed=${failures.length}`,
        },
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      success: true,
      total: recipients.length,
      sent,
      failed: failures.length,
      failures: failures.slice(0, 20),
      message: `群发完成：成功 ${sent} / ${recipients.length}${failures.length ? `，失败 ${failures.length}` : ""}`,
    });
  }

  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}

export async function GET() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.id || !isAdminRole(user.role)) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }
  try {
    const rows = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    // never return the raw SMTP password
    if (map.smtp_pass) map.smtp_pass = "********";

    const [userCount, memberCount, officerCount, adminCount, verifiedCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "MEMBER" } }),
      prisma.user.count({ where: { role: "OFFICER" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { emailVerified: { not: null } } }),
    ]);

    return NextResponse.json({
      settings: map,
      configured: await isMailConfigured(),
      counts: {
        USER: userCount,
        MEMBER: memberCount,
        OFFICER: officerCount,
        ADMIN: adminCount,
        verified: verifiedCount,
      },
    });
  } catch (error) {
    console.error("Mail GET error:", error);
    return NextResponse.json({ error: "获取配置失败" }, { status: 500 });
  }
}