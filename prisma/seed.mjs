// Plain-JS seeder (runs with `node`, no tsx required) so the Docker
// runtime can seed on first boot. Idempotent — safe to run repeatedly.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Initial admin account + outbound mail credentials.
// Override with env vars (recommended) — see .env.example
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "flamekeeper_admin@163.com").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "flamekeeper#110";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.163.com";
const SMTP_PORT = process.env.SMTP_PORT || "465";
const SMTP_SECURE = process.env.SMTP_SECURE || "true";
const SMTP_USER = process.env.SMTP_USER || ADMIN_EMAIL;
const SMTP_PASS = process.env.SMTP_PASS || ADMIN_PASSWORD;
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "Eternal Flame 守焰者";

async function main() {
  console.log("🌱 Seeding database...");

  // ---- Initial admin account ----
  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      name: "火焰守护者",
      role: "ADMIN",
      status: "APPROVED",
      emailVerified: new Date(),
    },
  });

  // ---- Default settings ----
  const defaultSettings = [
    { key: "site_title", value: "Eternal Flame | 守焰者" },
    { key: "site_description", value: "薪火不灭，荣耀永燃" },
    { key: "guild_name", value: "Eternal Flame" },
    { key: "guild_chinese_name", value: "守焰者" },
    { key: "guild_server", value: "待定" },
    { key: "guild_faction", value: "待定" },
    { key: "kook_invite_url", value: "" },
    { key: "wechat_qr_image", value: "" },
    { key: "recruitment_status", value: "招募中" },
    { key: "officer_emails", value: ADMIN_EMAIL },

    // ---- Mail / SMTP (outbound) ----
    { key: "mail_enabled", value: "true" },
    { key: "smtp_host", value: SMTP_HOST },
    { key: "smtp_port", value: SMTP_PORT },
    { key: "smtp_secure", value: SMTP_SECURE },
    { key: "smtp_user", value: SMTP_USER },
    { key: "smtp_pass", value: SMTP_PASS },
    { key: "smtp_from_name", value: SMTP_FROM_NAME },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  // ---- Welcome post ----
  await prisma.post.upsert({
    where: { slug: "welcome-to-eternal-flame" },
    update: {},
    create: {
      title: "欢迎来到 Eternal Flame · 守焰者",
      slug: "welcome-to-eternal-flame",
      content: `## 薪火不灭，荣耀永燃

欢迎来到 Eternal Flame 公会官方网站！

我们是一支以团队副本为核心、注重成员成长的魔兽世界公会。

### 网站功能

- **信息发布**：公会公告、新闻、战报与活动通知
- **入会指南**：了解如何加入我们
- **公会介绍**：了解我们的故事与理念
- **成员名册**：查看公会成员列表
- **工具分享**：插件推荐、WA 字符串与成员分享
- **数据分析**：公会数据可视化

### 注册流程

1. 注册账号并填写角色资料
2. 前往邮箱点击验证链接完成确认
3. 等待官员审核入会申请

如有任何问题，欢迎通过 KOOK 或微信群联系我们！`,
      excerpt: "薪火不灭，荣耀永燃。欢迎来到 Eternal Flame 公会官方网站！",
      category: "ANNOUNCEMENT",
      isPinned: true,
      isPublished: true,
      publishedAt: new Date(),
      authorId: admin.id,
    },
  });

  console.log("✅ Database seeded successfully!");
  console.log(`   Admin email:    ${ADMIN_EMAIL}`);
  console.log(`   Admin password: ${ADMIN_PASSWORD}`);
  console.log(`   SMTP sender:    ${SMTP_USER} @ ${SMTP_HOST}:${SMTP_PORT} (secure=${SMTP_SECURE})`);
  console.log("   ⚠  请登录后立即修改管理员密码。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });