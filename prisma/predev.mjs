// 在 `npm run dev` / `npm start` 之前运行，确保数据库可直接使用：
//   1) prisma db push  —— 建表 / 同步表结构
//   2) prisma/seed.mjs —— 补齐缺失的初始数据（admin 账号、系统设置、欢迎公告）
//
// 为什么需要：只有 Docker 启动会走 prisma/init-db.mjs + seed.mjs；
// 本地 `next dev` 不会。新克隆的仓库、或刚被清空的数据库，直接
// `npm run dev` 会出现「登录报错 / 页面没数据」，而错误信息很不直观。
//
// 行为：
//   - 两步都是幂等的：db push 只做增量变更；seed 只填缺失值，
//     不会覆盖你在后台改过的配置
//   - 失败即中止，并给出可操作的原因（而不是让 dev 带着坏库启动）
//   - 逃生舱：SKIP_DB_PUSH=1 npm run dev  （例如只想预览前端、数据库没开）
import { execSync } from "node:child_process";

if (process.env.SKIP_DB_PUSH === "1" || process.env.SKIP_DB_PUSH === "true") {
  console.log("⏭  SKIP_DB_PUSH=1 —— 跳过建表/初始化（数据库相关功能可能不可用）");
  process.exit(0);
}

const run = (cmd) =>
  execSync(cmd, {
    stdio: "inherit",
    env: process.env,
    // npx --no-install 防止在找不到本地 prisma 时尝试联网下载
  });

try {
  console.log("🔎 检查数据库表结构（prisma db push）...");
  run("npx --no-install prisma db push --skip-generate");
} catch {
  console.error("");
  console.error("╭──────────────────────────────────────────────────────────────╮");
  console.error("│ ✘ 建表失败：无法连接数据库或 DATABASE_URL 配置有误            │");
  console.error("╰──────────────────────────────────────────────────────────────╯");
  console.error("");
  console.error("  请依次检查：");
  console.error("    1. 数据库是否已启动、网络是否可达");
  console.error("       例：ping 192.168.3.80 / telnet 192.168.3.80 5432");
  console.error("    2. .env 里的 DATABASE_URL 是否正确");
  console.error("       —— 密码含 # @ : / ? ! 等字符必须做百分号编码，");
  console.error("          否则会被 URL 解析器截断，报 invalid port number");
  console.error("    3. 密码改过？执行 `npm run db:sync` 自动重新派生 DATABASE_URL");
  console.error("");
  console.error("  仅想启动前端预览（不需要数据库）：");
  console.error("       SKIP_DB_PUSH=1 npm run dev");
  console.error("");
  process.exit(1);
}

try {
  console.log("🌱 补齐初始数据（admin 账号 / 系统设置 / 欢迎公告）...");
  run("node prisma/seed.mjs");
} catch {
  console.error("");
  console.error("⚠  初始数据写入失败（表已建好，程序仍会启动）。");
  console.error("   如需重试： npm run db:seed");
  console.error("");
}