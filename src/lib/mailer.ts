import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";

export interface MailConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
}

export const MAIL_SETTING_KEYS = {
  enabled: "mail_enabled",
  host: "smtp_host",
  port: "smtp_port",
  secure: "smtp_secure",
  user: "smtp_user",
  pass: "smtp_pass",
  fromName: "smtp_from_name",
} as const;

const DEFAULTS: MailConfig = {
  enabled: true,
  host: process.env.SMTP_HOST || "smtp.163.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: (process.env.SMTP_SECURE ?? "true") === "true",
  user: process.env.SMTP_USER || "",
  pass: process.env.SMTP_PASS || "",
  fromName: process.env.SMTP_FROM_NAME || "Eternal Flame 守焰者",
};

function truthy(v: string | undefined | null): boolean | null {
  if (v == null || v === "") return null;
  return v === "true" || v === "1" || v === "yes";
}

/** Resolve mail config: DB Settings take precedence, env vars fill gaps. */
export async function getMailConfig(): Promise<MailConfig> {
  let map: Record<string, string> = {};
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: Object.values(MAIL_SETTING_KEYS) } },
    });
    for (const r of rows) map[r.key] = r.value;
  } catch {
    // ignore — fall back to env/defaults
  }

  const enabled = truthy(map[MAIL_SETTING_KEYS.enabled]);
  const secure = truthy(map[MAIL_SETTING_KEYS.secure]);

  return {
    enabled: enabled ?? DEFAULTS.enabled,
    host: map[MAIL_SETTING_KEYS.host] || DEFAULTS.host,
    port: Number(map[MAIL_SETTING_KEYS.port] || DEFAULTS.port),
    secure: secure ?? DEFAULTS.secure,
    user: map[MAIL_SETTING_KEYS.user] || DEFAULTS.user,
    pass: map[MAIL_SETTING_KEYS.pass] || DEFAULTS.pass,
    fromName: map[MAIL_SETTING_KEYS.fromName] || DEFAULTS.fromName,
  };
}

export async function isMailConfigured(): Promise<boolean> {
  const c = await getMailConfig();
  return c.enabled && !!c.host && !!c.user && !!c.pass;
}

// Cache transporter per config signature to avoid reconnecting every send
let cachedKey = "";
let cachedTransport: Transporter | null = null;

function transportFor(cfg: MailConfig): Transporter {
  const key = `${cfg.host}:${cfg.port}:${cfg.secure}:${cfg.user}:${cfg.pass}`;
  if (cachedTransport && cachedKey === key) return cachedTransport;

  cachedTransport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure, // true for 465, false for 587/25
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  cachedKey = key;
  return cachedTransport;
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<SendResult> {
  const cfg = await getMailConfig();
  if (!cfg.enabled) return { ok: false, error: "邮件服务未启用" };
  if (!cfg.host || !cfg.user || !cfg.pass) {
    return { ok: false, error: "邮件服务未配置（缺少 SMTP 主机/账号/密码）" };
  }

  try {
    const transporter = transportFor(cfg);
    const from = `${cfg.fromName} <${cfg.user}>`;
    await transporter.sendMail({
      from,
      to: Array.isArray(opts.to) ? opts.to.join(",") : opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("sendMail error:", msg);
    return { ok: false, error: msg };
  }
}

export async function verifyMailConfig(): Promise<SendResult> {
  const cfg = await getMailConfig();
  if (!cfg.enabled) return { ok: false, error: "邮件服务未启用" };
  if (!cfg.host || !cfg.user || !cfg.pass) {
    return { ok: false, error: "缺少 SMTP 主机/账号/密码" };
  }
  try {
    await transportFor(cfg).verify();
    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, error: msg };
  }
}

/** Shared WoW-themed HTML shell */
export function mailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,'Segoe UI','Noto Sans SC',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#1A1A1E;border:1px solid rgba(240,184,35,0.3);border-radius:12px;overflow:hidden;">
        <tr><td style="padding:28px 32px;border-bottom:1px solid #2A2A30;">
          <div style="font-size:20px;font-weight:800;color:#F0B823;letter-spacing:2px;">🔥 ETERNAL FLAME</div>
          <div style="font-size:12px;color:#9D9D9D;letter-spacing:4px;margin-top:2px;">守焰者 · 薪火不灭，荣耀永燃</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#F0B823;">${title}</h1>
          <div style="font-size:15px;line-height:1.7;color:#EBEBEB;">${bodyHtml}</div>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #2A2A30;font-size:12px;color:#666;">
          Eternal Flame 公会 · 本邮件由系统自动发送，请勿直接回复。
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function verificationEmailHtml(params: {
  nickname: string;
  verifyUrl: string;
  expiresHours: number;
  appUrl: string;
}): string {
  const { nickname, verifyUrl, expiresHours } = params;
  return mailShell(
    "确认你的邮箱",
    `<p>${nickname ? `${nickname}，你好：` : "你好："}</p>
     <p>感谢注册 Eternal Flame（守焰者）公会。请点击下面的按钮确认你的邮箱地址，完成后即可进入入会审批流程。</p>
     <p style="text-align:center;margin:28px 0;">
       <a href="${verifyUrl}" style="display:inline-block;padding:12px 28px;background:#F0B823;color:#000;font-weight:700;text-decoration:none;border-radius:8px;">确认邮箱</a>
     </p>
     <p style="font-size:13px;color:#9D9D9D;">链接 ${expiresHours} 小时内有效。如果按钮无法点击，请复制以下地址到浏览器打开：</p>
     <p style="font-size:12px;word-break:break-all;color:#69CCF0;">${verifyUrl}</p>
     <p style="font-size:13px;color:#9D9D9D;">如果这不是你本人的操作，请忽略本邮件。</p>`
  );
}

export function shareNoticeEmailHtml(params: {
  recipientName: string;
  title: string;
  author: string;
  url: string;
}): string {
  return mailShell(
    "公会有了新的分享",
    `<p>${params.recipientName ? `${params.recipientName}，你好：` : "你好："}</p>
     <p>成员 <strong>${params.author}</strong> 在「工具分享」发布了一篇新内容：</p>
     <p style="font-size:16px;color:#F0B823;font-weight:700;">${params.title}</p>
     <p style="text-align:center;margin:24px 0;">
       <a href="${params.url}" style="display:inline-block;padding:12px 28px;background:#F0B823;color:#000;font-weight:700;text-decoration:none;border-radius:8px;">查看分享</a>
     </p>`
  );
}