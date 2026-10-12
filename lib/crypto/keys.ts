/**
 * @file    lib/crypto/keys.ts
 * @brief   Encrypt owner-bound API keys and mask credentials for public metadata
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";
const nonceBytes = 12;
const tagBytes = 16;

function encryptionSecret(secret: string): Buffer {
  if (!/^[a-f0-9]{64}$/i.test(secret)) {
    throw new Error("KEYS_ENC_SECRET must contain exactly 64 hexadecimal characters (32 random bytes).");
  }
  return Buffer.from(secret, "hex");
}

function ownerContext(ownerId: string): Buffer {
  if (!ownerId.trim()) throw new Error("Owner is required for API key encryption.");
  return Buffer.from(`prd-generator:user-key:v1:${ownerId}`, "utf8");
}

export function encryptKey(apiKey: string, secret: string, ownerId: string): string {
  const key = encryptionSecret(secret);
  if (!apiKey.trim()) throw new Error("API key is required.");
  const nonce = randomBytes(nonceBytes);
  const cipher = createCipheriv(algorithm, key, nonce, { authTagLength: tagBytes });
  cipher.setAAD(ownerContext(ownerId));
  const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  return ["v1", nonce.toString("hex"), cipher.getAuthTag().toString("hex"), encrypted.toString("hex")].join(":");
}

function parseCiphertext(value: string) {
  const parts = value.split(":");
  const [version, nonce, tag, ciphertext] = parts;
  if (parts.length !== 4 || version !== "v1" || !/^[a-f0-9]{24}$/.test(nonce)
    || !/^[a-f0-9]{32}$/.test(tag) || !/^(?:[a-f0-9]{2})+$/.test(ciphertext)) {
    throw new Error("Invalid encrypted key format.");
  }
  return { nonce: Buffer.from(nonce, "hex"), tag: Buffer.from(tag, "hex"), ciphertext: Buffer.from(ciphertext, "hex") };
}

export function decryptKey(value: string, secret: string, ownerId: string): string {
  const key = encryptionSecret(secret);
  try {
    const { nonce, tag, ciphertext } = parseCiphertext(value);
    const decipher = createDecipheriv(algorithm, key, nonce, { authTagLength: tagBytes });
    decipher.setAAD(ownerContext(ownerId));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    // Crypto/parser details can contain sensitive context; expose one boundary error.
    throw new Error("Unable to decrypt API key. Verify its owner and encryption configuration.");
  }
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return "****";
  return `${apiKey.startsWith("sk-") ? "sk-" : ""}...${apiKey.slice(-4)}`;
}
