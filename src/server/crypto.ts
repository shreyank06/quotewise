import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Envelope format: v1.<iv>.<authTag>.<ciphertext>, all base64url.
// The owning company's id is bound in as AES-GCM associated data, so a ciphertext copied
// onto another company's row fails to decrypt instead of quietly working.
const VERSION = "v1";

function masterKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) throw new Error("APP_ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("APP_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  return key;
}

export function encryptSecret(plaintext: string, associatedData: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  cipher.setAAD(Buffer.from(associatedData));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), ciphertext].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function decryptSecret(envelope: string, associatedData: string): string {
  const [version, iv, tag, ciphertext] = envelope.split(".");
  if (version !== VERSION || !iv || !tag || !ciphertext) throw new Error("Unrecognised secret envelope");
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(associatedData));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

/** What the UI may show about a stored key: provider prefix and last four characters. */
export function secretHint(secret: string): string {
  const prefix = secret.match(/^(sk-ant-|sk-proj-|sk-)/)?.[0] ?? "";
  return `${prefix}…${secret.slice(-4)}`;
}
