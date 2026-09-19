// Canonical secret encryption — plain ESM so BOTH the Next.js app
// (src/lib/secrets.ts re-exports this) and the standalone scripts
// (prisma/seed.mjs) can use one implementation.
//
// DO NOT change the wire format without bumping PREFIX: existing rows in
// the Setting table must stay decryptable.
//
//   v1:<iv base64>:<authTag base64>:<ciphertext base64>
//
// Key = SHA-256(AUTH_SECRET + ":" + KDF_INFO)   -> 32 bytes for AES-256-GCM
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "v1";
const KDF_INFO = "flamekeeper:secrets:v1";

function derivedKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set — cannot derive the encryption key");
  }
  return createHash("sha256").update(`${secret}:${KDF_INFO}`).digest();
}

export function isEncrypted(value) {
  return typeof value === "string" && value.startsWith(`${PREFIX}:`);
}

export function encryptSecret(plain) {
  const iv = randomBytes(12); // 96-bit nonce, recommended for GCM
  const cipher = createCipheriv("aes-256-gcm", derivedKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

/**
 * Decrypt a value produced by encryptSecret().
 * Returns "" (and logs) when the payload cannot be decrypted — e.g. after
 * AUTH_SECRET was rotated — so callers never send a ciphertext as a password.
 * Legacy plaintext (no "v1:" prefix) is returned unchanged.
 */
export function decryptSecret(stored) {
  if (!stored) return "";
  if (!isEncrypted(stored)) return stored;

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