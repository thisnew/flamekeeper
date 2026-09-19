// Bootstrap a fresh database from prisma/init.sql.
// Runs with plain `node` (no Prisma CLI needed) so it works in the slim
// production image. Idempotent: skips everything if the schema exists.
//
// init.sql is produced at docker build time:
//   prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(here, "init.sql");

const prisma = new PrismaClient();

const url = process.env.DATABASE_URL || "";
const isPostgres = /^postgres(ql)?:\/\//i.test(url);

async function schemaExists() {
  try {
    const rows = isPostgres
      ? await prisma.$queryRawUnsafe(
          "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User'"
        )
      : await prisma.$queryRawUnsafe(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='User'"
        );
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

function splitStatements(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function main() {
  console.log(`🔌 数据库驱动: ${isPostgres ? "PostgreSQL" : "SQLite(legacy)"}`);

  if (await schemaExists()) {
    console.log("✔ 数据库已初始化，跳过建表");
    return;
  }

  if (!existsSync(sqlPath)) {
    console.error("✘ 找不到 prisma/init.sql，无法初始化数据库");
    console.error("  该文件在 docker build 时生成；本地开发请改用: npm run db:push");
    process.exit(1);
  }

  const statements = splitStatements(readFileSync(sqlPath, "utf8"));
  for (const stmt of statements) {
    await prisma.$executeRawUnsafe(stmt);
  }
  console.log(`✔ 数据库初始化完成（执行 ${statements.length} 条语句）`);
}

main()
  .catch((e) => {
    console.error("✘ 数据库初始化失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });