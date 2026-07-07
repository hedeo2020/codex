import crypto from "node:crypto";

export type EncryptedTemplate = { ciphertext: Buffer; iv: Buffer; authTag: Buffer };

function encryptionKey() {
  const raw = process.env.BIOMETRIC_ENCRYPTION_KEY;
  if (!raw) throw new Error("BIOMETRIC_ENCRYPTION_KEY is required");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("BIOMETRIC_ENCRYPTION_KEY must decode to 32 bytes");
  return key;
}

export function encryptBiometricTemplate(template: Float32Array): EncryptedTemplate {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(template.buffer)), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}

export function decryptBiometricTemplate(value: EncryptedTemplate): Float32Array {
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), value.iv);
  decipher.setAuthTag(value.authTag);
  const bytes = Buffer.concat([decipher.update(value.ciphertext), decipher.final()]);
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

export function cosineSimilarity(a: Float32Array, b: Float32Array) {
  if (a.length !== b.length || !a.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; normA += a[i] ** 2; normB += b[i] ** 2; }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function hashToken(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }
export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => !/embedding|template|password|pin|token/i.test(key)).map(([k,v]) => [k, redactSensitive(v)]));
}
