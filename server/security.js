import crypto from "node:crypto";

const tokenBytes = Number.parseInt(process.env.ACCESS_TOKEN_BYTES || "32", 10);
const hashSecret = process.env.SESSION_SECRET || "dev-session-secret-change-me";
const encryptionKey = crypto.createHash("sha256").update(hashSecret).digest();

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function randomToken(prefix = "hsc") {
  return `${prefix}-${crypto.randomBytes(tokenBytes).toString("hex")}`;
}

export function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function hashToken(token) {
  return sha256(token);
}

export function hashPrompt(promptText) {
  return sha256(String(promptText || "").trim());
}

export function hashIp(ipAddress) {
  if (!ipAddress) {
    return null;
  }
  return crypto
    .createHmac("sha256", hashSecret)
    .update(String(ipAddress))
    .digest("hex");
}

export function encryptValue(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptValue(payload) {
  if (!payload) {
    return null;
  }
  const [ivHex, tagHex, encryptedHex] = String(payload).split(":");
  if (!ivHex || !tagHex || !encryptedHex) {
    return null;
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function clientIp(request) {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.ip || request.socket.remoteAddress || "";
}
