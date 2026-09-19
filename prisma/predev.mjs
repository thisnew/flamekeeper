// 在 `npm run dev` / `npm start` 之前运行，确保数据库表结构与
// prisma/schema.prisma 一致。
//
// 为什么需要：只有 Docker 启动会走 prisma/init-db.mjs 建表；
// 本地 `next dev` 不会。新克隆的仓库、或刚被清空的数据库，直接
// `npm run dev` 会出现「登录报错 / 页面没数据」，但错误信息很不直观。
//
// 行为：
//   - 幂等：db push 对已有表只做增量变更，不会删数据
//   - 失败即中止，并给出可操作的原因（而不是让 dev 带着坏库启动）
//   - 逃生舱：SKIP_DB_PUSH=1 npm run dev   （例如只想预览前端、数据库没开）
import { execSync } from "node:child_process";

if (process.env.SKIP_DB_PUSH === "1" || process.env.SKIP_DB_PUSH === "true") {
  console.log("⏭  SKIP_DB_PUSH=1 —— 跳过建表检查（数据库相关功能可能不可用）");
  process.exit(0);
}

console.log("🔎 检查数据库表结构（prisma db push）...");

try {
  // --no-install 防止 npx 在找不到本地 prisma 时尝试联网下载
  execSync("npx --no-install prisma db push --skip-generate", {
    stdio: "inherit",
    env: process.env,
  });
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