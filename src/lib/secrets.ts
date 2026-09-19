/**
 * Typed facade over the canonical implementation in prisma/secrets.mjs.
 *
 * The implementation lives in prisma/ as plain ESM so the standalone
 * scripts (prisma/seed.mjs, prisma/init-db.mjs) can import the exact same
 * code without needing a TypeScript loader. Keep the crypto in ONE place —
 * do not reimplement it here.
 *
 * Used for secrets that must live in the database (currently: smtp_pass
 * in the `Setting` table). See README → 邮件服务 for the operational notes.
 */
export {
  encryptSecret,
  decryptSecret,
  isEncrypted,
} from "../../prisma/secrets.mjs";