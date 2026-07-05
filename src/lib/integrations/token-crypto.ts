import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function encryptionKey(): Buffer | null {
  const raw = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  return createHash("sha256").update(raw).digest();
}

export function encryptIntegrationToken(plaintext: string): string {
  const key = encryptionKey();
  if (!key) {
    return Buffer.from(plaintext, "utf8").toString("base64url");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptIntegrationToken(payload: string): string {
  const key = encryptionKey();
  const buf = Buffer.from(payload, "base64url");
  if (!key) {
    return buf.toString("utf8");
  }
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

export function isIntegrationsDemoMode(): boolean {
  if (process.env.INTEGRATIONS_DEMO_MODE === "true") {
    return true;
  }

  const credentialPairs = [
    ["CANVA_CLIENT_ID", "CANVA_CLIENT_SECRET"],
    ["HIGGSFIELD_CLIENT_ID", "HIGGSFIELD_CLIENT_SECRET"],
    ["GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET"],
    ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET"],
  ] as const;

  return credentialPairs.every(
    ([clientId, clientSecret]) =>
      !process.env[clientId]?.trim() || !process.env[clientSecret]?.trim(),
  );
}
