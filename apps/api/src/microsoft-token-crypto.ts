import crypto from "node:crypto";

export function encryptMicrosoftToken(value: string, secret: string) {
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptMicrosoftToken(ciphertext: string, secret: string) {
  const [ivValue, tagValue, encryptedValue] = ciphertext.split(".");

  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Encrypted Microsoft token is malformed.");
  }

  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = Buffer.from(ivValue, "base64url");
  const tag = Buffer.from(tagValue, "base64url");
  const encrypted = Buffer.from(encryptedValue, "base64url");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
