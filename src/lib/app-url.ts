/**
 * 站点对外地址，用于拼接**绝对**链接（邮件里的重置/验证链接、日历订阅地址等）。
 *
 * ⚠ 为什么 AUTH_URL 必须排在 NEXT_PUBLIC_APP_URL 前面：
 *
 *   Next.js 在**构建期**会把 `process.env.NEXT_PUBLIC_*` 直接文本替换成字面量，
 *   服务端产物与客户端产物**都会被替换**（实测：`next build` 产出的 243 个
 *   server chunk 与 29 个 client chunk 里，都搜不到 "NEXT_PUBLIC_APP_URL"
 *   这个字符串本身）。
 *
 *   后果：镜像一旦构建完成，NEXT_PUBLIC_APP_URL 就**固定**了。
 *   部署时改 .env / compose 的 environment **完全不生效**，必须重新构建镜像。
 *
 *   `AUTH_URL` 不以 NEXT_PUBLIC_ 开头，是真正的**运行时**变量
 *   （实测产物中仍保留 process.env.AUTH_URL 的访问）。
 *   所以换域名或换端口（例如 https://example.com:22247）时，
 *   只要改运行时环境变量即可，无需重新构建镜像。
 *
 * 返回值结尾不带斜杠。
 */
export function appUrl(): string {
  return (
    process.env.AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/**
 * 把 appUrl() 解析成 URL 对象；地址非法时退回 localhost。
 *
 * 用于 metadataBase 这类在**模块加载期**就要拿到 URL 的场景 ——
 * 如果 AUTH_URL 被填成非法字符串，直接 `new URL()` 会在 import 期抛异常，
 * 整个应用起不来。
 */
export function appUrlObject(): URL {
  try {
    return new URL(appUrl());
  } catch {
    return new URL("http://localhost:3000");
  }
}
