import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret, isEncrypted } from "@/lib/secrets";

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

  // smtp_pass is stored encrypted; transparently upgrade legacy plaintext.
  const storedPass = map[MAIL_SETTING_KEYS.pass] || "";
  let pass: string;
  if (!storedPass) {
    pass = DEFAULTS.pass;
  } else if (isEncrypted(storedPass)) {
    pass = decryptSecret(storedPass);
  } else {
    // Legacy plaintext row (e.g. seeded before encryption existed):
    // use it now, persist the encrypted form in the background.
    // Best-effort: a missing AUTH_SECRET must not break mail sending.
    pass = storedPass;
    try {
      const upgraded = encryptSecret(storedPass);
      prisma.setting
        .update({ where: { key: MAIL_SETTING_KEYS.pass }, data: { value: upgraded } })
        .then(() => console.log("[mailer] smtp_pass 已从明文升级为加密存储"))
        .catch((e) => console.error("[mailer] smtp_pass 加密升级失败:", e?.message ?? e));
    } catch (e) {
      console.error(
        "[mailer] 无法加密 smtp_pass（AUTH_SECRET 未设置？），本次仍以明文使用:",
        e instanceof Error ? e.message : e
      );
    }
  }

  return {
    enabled: enabled ?? DEFAULTS.enabled,
    host: map[MAIL_SETTING_KEYS.host] || DEFAULTS.host,
    port: Number(map[MAIL_SETTING_KEYS.port] || DEFAULTS.port),
    secure: secure ?? DEFAULTS.secure,
    user: map[MAIL_SETTING_KEYS.user] || DEFAULTS.user,
    pass: pass || DEFAULTS.pass,
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

/**
 * Turn raw SMTP/nodemailer errors into an actionable Chinese hint.
 * The original message is appended so nothing is hidden from the admin.
 */
export function explainMailError(raw: string): string {
  const s = raw || "";
  const hint = (text: string) => `${text}（原始错误：${s}）`;

  if (/535|authentication failed|Invalid login/i.test(s)) {
    return hint(
      "认证失败：163/126 邮箱必须使用「授权码」而非登录密码。请到邮箱网页版 → 设置 → POP3/SMTP/IMAP，" +
        "开启 SMTP 服务并生成授权码（通常为 16 位纯字母数字），填入「密码 / 授权码」后保存再测试"
    );
  }
  if (/534|^530/i.test(s)) {
    return hint("认证被拒绝：请确认已开启邮箱的 SMTP 服务，并使用授权码");
  }
  if (/ENOTFOUND|getaddrinfo/i.test(s)) {
    return hint("无法解析 SMTP 主机名：请检查「SMTP 主机」是否填写正确");
  }
  if (/ETIMEDOUT|ECONNECTION|ESOCKET|ECONNREFUSED|timeout/i.test(s)) {
    return hint(
      "无法连接 SMTP 服务器：请检查主机/端口/加密方式（465 用 SSL，587 用 STARTTLS），以及服务器能否访问外网"
    );
  }
  if (/550|553|User not found|Mailbox not found/i.test(s)) {
    return hint("收件地址被服务器拒绝：请确认收件人邮箱存在且允许接收");
  }
  if (/EENVELOPE|Sender address rejected/i.test(s)) {
    return hint("发件/收件地址无效：请确认「发信账号」与邮箱地址一致");
  }
  return s;
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
    return { ok: false, error: explainMailError(msg) };
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
    return { ok: false, error: explainMailError(msg) };
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

export function passwordResetEmailHtml(params: {
  nickname: string;
  resetUrl: string;
  expiresMinutes: number;
}): string {
  const { nickname, resetUrl, expiresMinutes } = params;
  const humanTtl =
    expiresMinutes >= 60 ? `${Math.round(expiresMinutes / 60)} 小时` : `${expiresMinutes} 分钟`;
  return mailShell(
    "重置你的密码",
    `<p>${nickname ? `${nickname}，你好：` : "你好："}</p>
     <p>我们收到了重置 Eternal Flame（守焰者）账号密码的请求。点击下面的按钮设置新密码：</p>
     <p style="text-align:center;margin:28px 0;">
       <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background:#F0B823;color:#000;font-weight:700;text-decoration:none;border-radius:8px;">设置新密码</a>
     </p>
     <p style="font-size:13px;color:#9D9D9D;">链接 <strong>${humanTtl}</strong>内有效，且只能使用一次。如果按钮无法点击，请复制以下地址到浏览器打开：</p>
     <p style="font-size:12px;word-break:break-all;color:#69CCF0;">${resetUrl}</p>
     <p style="font-size:13px;color:#9D9D9D;">如果这不是你本人的操作，请忽略本邮件 —— 你的密码<strong>不会</strong>被更改。</p>`
  );
}