import crypto from "node:crypto";

import { normalizeEmail, sha256 } from "./security.js";

const adminSessionCookieName = "hc_admin";
const sessionSecret = process.env.SESSION_SECRET || "dev-session-secret-change-me";
const sessionMaxAgeSeconds = Number.parseInt(process.env.ADMIN_SESSION_SECONDS || "28800", 10);

export function configuredAdminEmail() {
  return normalizeEmail(process.env.ADMIN_EMAIL || "");
}

export function verifyAdminPassword(email, password) {
  const adminEmail = configuredAdminEmail();
  const passwordHash = String(process.env.ADMIN_PASSWORD_HASH || "").trim().toLowerCase();
  if (!adminEmail || !passwordHash) {
    return false;
  }
  if (normalizeEmail(email) !== adminEmail) {
    return false;
  }
  return safeEqual(sha256(password).toLowerCase(), passwordHash);
}

export function createAdminCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashAdminCode(email, code) {
  return sha256(`${normalizeEmail(email)}:${String(code).trim()}`);
}

export function createAdminSessionCookie(email) {
  const payload = {
    email: normalizeEmail(email),
    exp: Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(encodedPayload);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${adminSessionCookieName}=${encodedPayload}.${signature}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionMaxAgeSeconds}${secure}`;
}

export function clearAdminSessionCookie() {
  return `${adminSessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export function requireAdmin(request, response, next) {
  const session = readAdminSession(request);
  if (!session) {
    response.status(401).json({ error: "Admin login required." });
    return;
  }
  request.admin = session;
  next();
}

export function readAdminSession(request) {
  const cookieValue = parseCookies(request.headers.cookie || "")[adminSessionCookieName];
  if (!cookieValue) {
    return null;
  }
  const [encodedPayload, signature] = cookieValue.split(".");
  if (!encodedPayload || !signature || !safeEqual(sign(encodedPayload), signature)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (!payload?.email || !payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (normalizeEmail(payload.email) !== configuredAdminEmail()) {
      return null;
    }
    return { email: normalizeEmail(payload.email) };
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader) {
  return String(cookieHeader)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) {
        return cookies;
      }
      const key = part.slice(0, separatorIndex);
      const value = part.slice(separatorIndex + 1);
      cookies[key] = value;
      return cookies;
    }, {});
}

function sign(value) {
  return crypto.createHmac("sha256", sessionSecret).update(value).digest("hex");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
