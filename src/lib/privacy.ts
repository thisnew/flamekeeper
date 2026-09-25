/**
 * 隐私相关的展示工具。
 *
 * 背景：站点里有不少地方会用「昵称，没有就退回邮箱」的方式显示用户，
 * 邮箱因此经常出现在**他人可见**的页面上（名册、引荐树、活动报名、
 * 工具分享、后台列表…）。这里统一做中间段遮蔽。
 *
 * 注意：**本人**看自己的邮箱（个人中心、右上角菜单、注册/找回流程）
 * 不需要遮蔽 —— 只遮蔽「他人的」。
 */

/**
 * 遮蔽邮箱中间段。
 *
 * ```
 * zhangsan@126.com  ->  z***n@126.com
 * ab@qq.com         ->  a***@qq.com
 * a@x.com           ->  a***@x.com
 * ```
 *
 * 保留首字符与（长度 ≥3 时的）末字符，域名原样保留 ——
 * 域名不敏感，而完全打码就分不清是哪个邮箱了。
 * 不认识的值（没有 `@`、空值）原样返回，不丢信息。
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return email;

  const local = email.slice(0, at);
  const domain = email.slice(at);

  // ⚠ **幂等**：已经遮蔽过的不要再遮一次。
  //   否则 `ab@qq.com` -> `a***@qq.com` 再遮会变成 `a****@qq.com`。
  //   这一条让「数据层遮蔽 + 展示层遮蔽」可以同时存在而不会互相破坏。
  if (local.includes("***")) return email;

  if (local.length === 1) return `${local}***${domain}`;
  if (local.length === 2) return `${local[0]}***${domain}`;
  return `${local[0]}***${local[local.length - 1]}${domain}`;
}

/**
 * 「显示名，没有就用（已遮蔽的）邮箱」。
 * 用来替换散落各处的 `x.name || x.email`，避免有人漏加遮蔽。
 */
export function displayName(
  user: { name?: string | null; email?: string | null } | null | undefined
): string {
  if (!user) return "未知用户";
  return user.name || maskEmail(user.email) || "未知用户";
}
