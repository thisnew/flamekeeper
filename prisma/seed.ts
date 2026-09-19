import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminPassword = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@eternalflame.gg" },
    update: {},
    create: {
      email: "admin@eternalflame.gg",
      passwordHash: adminPassword,
      name: "火焰守护者",
      role: "ADMIN",
      status: "APPROVED",
      emailVerified: new Date(),
    },
  });

  // Create default settings
  const defaultSettings: Array<{ key: string; value: string }> = [
    { key: "site_title", value: "Eternal Flame | 守焰者" },
    { key: "site_description", value: "薪火不灭，荣耀永燃" },
    { key: "guild_name", value: "Eternal Flame" },
    { key: "guild_chinese_name", value: "守焰者" },
    { key: "guild_server", value: "待定" },
    { key: "guild_faction", value: "待定" },
    { key: "kook_invite_url", value: "" },
    { key: "wechat_qr_image", value: "" },
    { key: "recruitment_status", value: "招募中" },
    { key: "officer_emails", value: "admin@eternalflame.gg" },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  // Create welcome post
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
- **插件库**：精选插件推荐与 WA 字符串
- **数据分析**：公会数据可视化

### 下一步

1. 前往「入会指南」页面了解加入流程
2. 注册账号并提交入会申请
3. 等待官员审核

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
  console.log("   Admin email: admin@eternalflame.gg");
  console.log("   Admin password: admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });