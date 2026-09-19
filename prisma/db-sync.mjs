// Keep DATABASE_URL in .env in sync with POSTGRES_* — so the password only
// has to be changed in ONE place.
//
//   npm run db:sync
//   npm run db:sync -- --host 192.168.3.80 --port 5432 --db flamekeeper
//
// Why this exists: .env holds the DB password twice —
//   POSTGRES_PASSWORD="flamekeeper#2026!"            (plaintext, for the pg container)
//   DATABASE_URL="postgresql://…:flamekeeper%232026%21@…"  (percent-encoded, for Prisma)
// Editing only one of them silently breaks the connection. This script
// re-derives DATABASE_URL from POSTGRES_* every time.
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";

const ENV_PATH = ".env";
const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

/** Percent-encode everything outside the RFC 3986 unreserved set. */
function enc(s) {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}
const mask = (s) => (s ? `${s.slice(0, 2)}***${s.slice(-2)} (len=${s.length})` : "(empty)");

function parseEnv(text) {
  const map = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    map[m[1]] = v;
  }
  return map;
}

/** Best-effort extraction of host/port/db from an existing (possibly broken) URL. */
function sniff(url) {
  if (!url) return {};
  try {
    const u = new URL(url);
    return {
      host: u.hostname || undefined,
      port: u.port || undefined,
      db: (u.pathname || "").replace(/^\//, "") || undefined,
      schema: u.searchParams.get("schema") || "public",
    };
  } catch {
    // Broken URL (e.g. unencoded '#'): fall back to a regex sniff.
    const m = url.match(/@([^:/?#]+)(?::(\d+))?\/([^?#]*)/);
    return {
      host: m?.[1],
      port: m?.[2],
      db: m?.[3] || undefined,
      schema: "public",
    };
  }
}

let text;
try {
  text = readFileSync(ENV_PATH, "utf8");
} catch {
  console.error(`✘ 找不到 ${ENV_PATH}（请先 cp .env.example .env）`);
  process.exit(1);
}

const env = parseEnv(text);
const urlLine = text.split(/\r?\n/).find((l) => /^\s*DATABASE_URL\s*=/.test(l));
const currentUrl = urlLine ? urlLine.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "") : "";
const sniffed = sniff(currentUrl);

const user = flag("user", env.POSTGRES_USER || "flamekeeper");
const pass = flag("pass", env.POSTGRES_PASSWORD || "");
const host = flag("host", env.POSTGRES_HOST || sniffed.host || "localhost");
const port = flag("port", env.POSTGRES_PORT || sniffed.port || "5432");
const db = flag("db", env.POSTGRES_DB || sniffed.db || "flamekeeper");
const schema = env.POSTGRES_SCHEMA || sniffed.schema || "public";

if (!pass) {
  console.error("✘ 未找到 POSTGRES_PASSWORD（.env 里没有，也没有 --pass）");
  process.exit(1);
}

const newUrl = `postgresql://${enc(user)}:${enc(pass)}@${host}:${port}/${db}?schema=${schema}`;

// Sanity check: must parse back to the exact plaintext password.
let ok = false;
try {
  const u = new URL(newUrl);
  ok = u.hostname === host && u.port === port && decodeURIComponent(u.password) === pass;
} catch {
  ok = false;
}
if (!ok) {
  console.error("✘ 生成的 URL 校验失败，请检查 host/port 是否为合法值");
  process.exit(1);
}

const newLine = `DATABASE_URL="${newUrl}"`;
const outText = urlLine
  ? text.replace(urlLine, newLine)
  : `${text.replace(/\s*$/, "")}\n${newLine}\n`;

copyFileSync(ENV_PATH, `${ENV_PATH}.bak`);
writeFileSync(ENV_PATH, outText, "utf8");

console.log("");
console.log("✔ 已更新 .env（原文件备份为 .env.bak）");
console.log("");
console.log("  来源:");
console.log(`    用户:     ${user}`);
console.log(`    密码:     ${mask(pass)}   (明文，来自 POSTGRES_PASSWORD)`);
console.log(`    主机:端口 ${host}:${port}`);
console.log(`    数据库:   ${db}`);
console.log("");
console.log("  写入 .env:");
console.log(`    ${newLine}`);
console.log("");
console.log(`  校验: host/port/密码 均可被 URL 解析器正确还原 ✓`);
console.log("");
console.log("  提示: .env 与 .env.bak 都在 .gitignore 中，不会进入版本库。");