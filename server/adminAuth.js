import crypto from "node:crypto";

import { prisma } from "./db.js";
import { normalizeEmail, sha256 } from "./security.js";

export const permanentSuperAdminEmail = "manderson@hermanscience.com";

const adminSessionCookieName = "hc_admin";
const sessionSecret = process.env.SESSION_SECRET || "dev-session-secret-change-me";
const sessionMaxAgeSeconds = Number.parseInt(process.env.ADMIN_SESSION_SECONDS || "28800", 10);
const minimumPasswordLength = 12;

export async function ensurePermanentSuperAdmin() {
  const email = permanentSuperAdminEmail;
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    if (!existing.isSuperAdmin || !existing.isPermanent || existing.mustChangePassword) {
      await prisma.admin.update({
        where: { id: existing.id },
        data: {
          isSuperAdmin: true,
          isPermanent: true,
          mustChangePassword: false,
        },
      });
    }
    return;
  }

  const configuredEmail = normalizeEmail(process.env.ADMIN_EMAIL || "");
  const configuredPasswordHash = String(process.env.ADMIN_PASSWORD_HASH || "").trim();
  if (configuredEmail !== email || !configuredPasswordHash) {
    console.warn(`Permanent super admin ${email} could not be bootstrapped from Railway variables.`);
    return;
  }

  await prisma.admin.create({
    data: {
      email,
      passwordHash: configuredPasswordHash,
      isSuperAdmin: true,
      isPermanent: true,
      mustChangePassword: false,
    },
  });
}

export async function authenticateAdmin(email, password) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    return null;
  }
  const admin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
  if (!admin || !verifyPasswordHash(password, admin.passwordHash)) {
    return null;
  }

  if (isLegacyPasswordHash(admin.passwordHash)) {
    return prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash: hashAdminPassword(password) },
    });
  }
  return admin;
}

export function validateAdminPassword(password) {
  if (String(password || "").length < minimumPasswordLength) {
    return `Password must be at least ${minimumPasswordLength} characters.`;
  }
  return null;
}

export function hashAdminPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(String(password), salt, 32);
  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export function verifyPasswordHash(password, storedHash) {
  const normalizedHash = String(storedHash || "").trim();
  if (isLegacyPasswordHash(normalizedHash)) {
    return safeEqual(sha256(password).toLowerCase(), normalizedHash.toLowerCase());
  }

  const [algorithm, saltValue, derivedValue] = normalizedHash.split("$");
  if (algorithm !== "scrypt" || !saltValue || !derivedValue) {
    return false;
  }
  try {
    const salt = Buffer.from(saltValue, "base64url");
    const expected = Buffer.from(derivedValue, "base64url");
    const actual = crypto.scryptSync(String(password), salt, expected.length);
    return safeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function createAdminCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashAdminCode(email, code) {
  return sha256(`${normalizeEmail(email)}:${String(code).trim()}`);
}

export function createAdminSessionCookie(admin) {
  const payload = {
    id: admin.id,
    email: normalizeEmail(admin.email),
    sessionVersion: admin.sessionVersion,
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

export async function requireAdmin(request, response, next) {
  try {
    const session = readAdminSession(request);
    if (!session) {
      response.status(401).json({ error: "Admin login required." });
      return;
    }
    const admin = await prisma.admin.findUnique({ where: { id: session.id } });
    if (
      !admin ||
      normalizeEmail(admin.email) !== session.email ||
      admin.sessionVersion !== session.sessionVersion
    ) {
      response.status(401).json({ error: "Admin login required." });
      return;
    }
    request.admin = admin;
    next();
  } catch (error) {
    console.error("Admin session lookup failed", error);
    response.status(500).json({ error: "Unable to verify admin session." });
  }
}

export function requireSuperAdmin(request, response, next) {
  if (!request.admin?.isSuperAdmin) {
    response.status(403).json({ error: "Super admin access required." });
    return;
  }
  next();
}

export function requireCompletedPasswordChange(request, response, next) {
  if (request.admin?.mustChangePassword) {
    response.status(403).json({ error: "Change your temporary password to continue." });
    return;
  }
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
    if (
      !payload?.id ||
      !payload?.email ||
      !Number.isInteger(payload?.sessionVersion) ||
      !payload?.exp ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return {
      id: String(payload.id),
      email: normalizeEmail(payload.email),
      sessionVersion: payload.sessionVersion,
    };
  } catch {
    return null;
  }
}

function isLegacyPasswordHash(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || ""));
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
  const leftBuffer = Buffer.isBuffer(left) ? left : Buffer.from(String(left));
  const rightBuffer = Buffer.isBuffer(right) ? right : Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
