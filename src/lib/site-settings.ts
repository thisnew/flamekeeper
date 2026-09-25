import { prisma } from "@/lib/prisma";

/**
 * 站点信息（可公开渲染的那部分）。
 *
 * 这些键的默认值**必须与后台「系统设置」里的一致** —— 所以默认值只定义在这里，
 * 由两处共同引用：
 *   - `app/admin/settings/page.tsx`（管理员编辑）
 *   - `components/layout/Footer.tsx` / `app/page.tsx`（站点渲染）
 *
 * 以前页脚和首页把标语、简介**硬编码**在组件里，后台改了设置它们也不变，
 * 于是「站点信息」形同虚设。现在统一从这张表取。
 *
 * ⚠ SMTP 密码等**敏感键不在本表内**，绝不能走这个函数回传浏览器。
 */
export const PUBLIC_SITE_DEFAULTS = {
  /** 站点标题（浏览器标签 / OG） */
  site_title: "Eternal Flame | 守焰者",
  /** 站点描述（meta description） */
  site_description: "薪火不灭，荣耀永燃",
  /** 公会英文名 */
  guild_name: "Eternal Flame",
  /** 公会中文名 */
  guild_chinese_name: "守焰者",
  /** 所在服务器 */
  guild_server: "",
  /** 阵营 */
  guild_faction: "",
  /** 招募状态（如「招募中」） */
  recruitment_status: "招募中",
  /** KOOK 邀请链接 */
  kook_invite_url: "",

  /** 页脚标语 */
  footer_tagline: "薪火不灭，荣耀永燃",
  /** 首页主标语（Hero 大字下面那行） */
  home_tagline: "薪火不灭，荣耀永燃",
  /** 首页简介段落 */
  home_intro:
    "一个以团队副本为核心、注重成员成长的魔兽世界公会。我们是火焰的守护者，也是彼此的战友。",
} as const;

export type PublicSiteSettings = Record<keyof typeof PUBLIC_SITE_DEFAULTS, string>;

/** 公开键名清单（用于只查这些键，避免把 SMTP 之类带出来）。 */
export const PUBLIC_SITE_KEYS = Object.keys(PUBLIC_SITE_DEFAULTS) as (keyof typeof PUBLIC_SITE_DEFAULTS)[];

/**
 * 读取站点信息：库里的值覆盖默认值。
 *
 * 空字符串**视为未配置**并回退到默认 —— 后台表单可能被清空，
 * 但站点上不该出现一片空白。
 */
export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  const rows = await prisma.setting
    .findMany({
      where: { key: { in: PUBLIC_SITE_KEYS } },
      select: { key: true, value: true },
    })
    .catch(() => [] as { key: string; value: string }[]);

  const out = { ...PUBLIC_SITE_DEFAULTS } as PublicSiteSettings;
  for (const r of rows) {
    if (r.value && r.value.trim()) {
      (out as Record<string, string>)[r.key] = r.value;
    }
  }
  return out;
}
