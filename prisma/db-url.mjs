// Build a correctly-encoded PostgreSQL connection string.
//
// Database passwords often contain characters that are special inside a
// URL — most notably "#" which starts the fragment. An unencoded "#"
// truncates the URL and Prisma fails with:
//   "invalid port number in database URL"
//
// Usage:
//   npm run db:url
//   npm run db:url -- --host 192.168.3.80 --user flamekeeper --db flamekeeper
//
// Values are read from (in order): CLI flags, env vars, then defaults.
// The password is printed only as its encoded form; pass --show to
// also print the decoded password for verification.

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const user = flag("user", process.env.POSTGRES_USER || "flamekeeper");
const pass = flag("pass", process.env.POSTGRES_PASSWORD || "");
const host = flag("host", process.env.POSTGRES_HOST || "localhost");
const port = flag("port", process.env.POSTGRES_PORT || "5432");
const db = flag("db", process.env.POSTGRES_DB || "flamekeeper");

/** Percent-encode everything that is not unreserved (RFC 3986). */
function encodeUserInfo(s) {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

const url = `postgresql://${encodeUserInfo(user)}:${encodeUserInfo(pass)}@${host}:${port}/${db}?schema=public`;

// Sanity check: must parse and round-trip the password exactly.
let ok = false;
try {
  const parsed = new URL(url);
  ok =
    parsed.hostname === host &&
    parsed.port === port &&
    decodeURIComponent(parsed.password) === pass;
} catch {
  ok = false;
}

console.log("");
console.log("将下面这行写入 .env（替换已有的 DATABASE_URL）：");
console.log("");
console.log(`DATABASE_URL="${url}"`);
console.log("");

if (args.includes("--show")) {
  console.log(`解码校验: ${decodeURIComponent(encodeUserInfo(pass)) === pass ? "✓ 与原始密码一致" : "✗ 不一致"}`);
  console.log("");
}

if (!pass) {
  console.log("⚠ 密码为空 —— 请用 --pass <密码> 或先导出 POSTGRES_PASSWORD 环境变量");
} else if (ok) {
  console.log("✓ 校验通过：host / port / 密码均可被正确解析");
} else {
  console.log("✗ 校验失败：请检查 host / port 是否为合法值");
}