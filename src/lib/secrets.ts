import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Symmetric encryption for secrets that must live in the database
 * (e.g. the SMTP password / 163 授权码 stored in the `Setting` table).
 *
 * Design:
 *  - AES-256-GCM (authenticated encryption: tampering is detected)
 *  - Key derived from AUTH_SECRET via SHA-256, so no extra env var to manage
 *  - Versioned envelope "v1:<iv>:<tag>:<ciphertext>" (all base64)
 *  - Plaintext legacy values are detected by the missing "v1:" prefix and
 *    are transparently upgraded on first read (see mailer.ts)
 *
 * ⚠ Changing AUTH_SECRET makes existing ciphertexts undecryptable. The
 *   affected values must be re-entered (admin → 系统设置 → 邮件服务).
 */

const PREFIX = "v1";
// Domain separator so the derived key is not shared with any other use.
const KDF_INFO = "flamekeeper:secrets:v1";

function derivedKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set — cannot derive the encryption key");
  }
  return createHash("sha256").update(`${secret}:${KDF_INFO}`).digest();
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(`${PREFIX}:`);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12); // 96-bit nonce, recommended for GCM
  const cipher = createCipheriv("aes-256-gcm", derivedKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64"),
    tag.toString("base64"),
    ct.toString("base64"),
  ].join(":");
}

/**
 * Decrypt a value produced by encryptSecret().
 * Returns "" (and logs) when the payload cannot be decrypted — e.g. after
 * AUTH_SECRET was rotated — so callers never send a ciphertext as a password.
 */
export function decryptSecret(stored: string): string {
  if (!stored) return "";
  if (!isEncrypted(stored)) return stored; // legacy plaintext, pass through

  try {
    const [, ivB64, tagB64, ctB64] = stored.split(":");
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const ct = Buffer.from(ctB64, "base64");

    const decipher = createDecipheriv("aes-256-gcm", derivedKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch (error) {
    console.error(
      "[secrets] 无法解密已存储的密文（AUTH_SECRET 是否被更换过？）:",
      error instanceof Error ? error.message : error
    );
    return "";
  }
}