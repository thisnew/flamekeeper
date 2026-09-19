/**
 * 站点对外地址，用于拼接邮件里的**绝对链接**（验证邮箱、重置密码等）。
 *
 * 返回值结尾不带斜杠。优先级：NEXT_PUBLIC_APP_URL → AUTH_URL → localhost。
 * 部署时必须与反向代理 / NAT 映射一致，否则邮件里的链接会指向错误域名。
 *
 * 服务端专用（读 process.env）。
 */
export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
