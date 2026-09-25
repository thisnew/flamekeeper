import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少6位"),
});

/**
 * 注册：**只填昵称**（+ 邮箱 + 密码）。
 *
 * 历史版本要求填角色名/服务器/阵营/职业/专精等游戏信息；运营后确认不必要 ——
 * 玩家角色改由「个人信息 → WTF 导入」产生（见 add-1），入会时不需要先有角色。
 */
/**
 * 昵称规则 —— 注册与「个人中心改昵称」**共用同一份**，
 * 否则两处迟早不一致（注册允许 20 字、改名允许 50 字之类）。
 */
export const nicknameSchema = z
  .string()
  .trim()
  .min(2, "昵称至少2个字符")
  .max(20, "昵称最长20个字符");

export const registerSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少6位"),
  confirmPassword: z.string(),
  nickname: nicknameSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次密码输入不一致",
  path: ["confirmPassword"],
});

export const profileSchema = z.object({
  displayName: z.string().optional(),
  bio: z.string().max(500).optional(),
});

export const postSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  content: z.string().min(1, "内容不能为空"),
  excerpt: z.string().optional(),
  coverImage: z.string().optional(),
  category: z.enum(["NEWS", "ANNOUNCEMENT", "BATTLE_REPORT", "EVENT", "RECRUITMENT", "MAINTENANCE"]),
  tags: z.string().optional(),
  isPinned: z.boolean().default(false),
  isPublished: z.boolean().default(false),
});

export const addonSchema = z.object({
  name: z.string().min(1, "插件名称不能为空"),
  description: z.string().min(1, "描述不能为空"),
  category: z.enum(["RAID", "MPLUS", "PVP", "UI", "CLASS", "WEAKAURA", "MACRO", "TOOL"]),
  applicableClass: z.string().optional(),
  gameVersion: z.string().optional(),
  downloadUrl: z.string().url("请输入有效的链接").optional().or(z.literal("")),
  waString: z.string().optional(),
  tutorialContent: z.string().optional(),
  screenshotUrl: z.string().optional(),
  isRecommended: z.boolean().default(false),
});

export const eventSchema = z.object({
  title: z.string().min(1, "活动标题不能为空"),
  description: z.string().optional(),
  eventType: z.enum(["RAID", "MPLUS", "PVP", "SOCIAL", "OTHER"]),
  startTime: z.string().min(1, "请选择开始时间"),
  endTime: z.string().min(1, "请选择结束时间"),
  maxSlots: z.coerce.number().min(1).optional(),
  location: z.string().optional(),
});

/**
 * 密码重置 —— 第一步：请求发送重置链接。
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

/**
 * 密码重置 —— 第二步：提交新密码。
 *
 * max(72) 来自 bcrypt 的输入上限（超过 72 字节会被静默截断，
 * 等于悄悄削弱密码强度）。这里显式拒绝更诚实。
 *
 * 注意：loginSchema / registerSchema 目前没有这个上限。故意不动它们
 * —— 若给 login 加上限，已经有超长密码的账号会突然无法登录。
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "缺少重置令牌"),
    password: z.string().min(6, "密码至少 6 位").max(72, "密码最长 72 个字符"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次密码输入不一致",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PostInput = z.infer<typeof postSchema>;
export type AddonInput = z.infer<typeof addonSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;