import assert from "node:assert/strict";
import test from "node:test";

import {
  createAdminSessionCookie,
  hashAdminPassword,
  readAdminSession,
  requireCompletedPasswordChange,
  requireSuperAdmin,
  validateAdminPassword,
  verifyPasswordHash,
} from "../server/adminAuth.js";
import { sha256 } from "../server/security.js";

test("new passwords use salted scrypt hashes", () => {
  const password = "correct horse battery staple";
  const firstHash = hashAdminPassword(password);
  const secondHash = hashAdminPassword(password);

  assert.match(firstHash, /^scrypt\$/);
  assert.notEqual(firstHash, secondHash);
  assert.equal(verifyPasswordHash(password, firstHash), true);
  assert.equal(verifyPasswordHash("wrong password", firstHash), false);
});

test("legacy SHA-256 password hashes remain valid during migration", () => {
  const password = "legacy-password";
  assert.equal(verifyPasswordHash(password, sha256(password)), true);
  assert.equal(verifyPasswordHash("wrong password", sha256(password)), false);
});

test("administrator passwords require at least 12 characters", () => {
  assert.match(validateAdminPassword("too-short"), /at least 12/);
  assert.equal(validateAdminPassword("long-enough-password"), null);
});

test("admin session cookies carry account identity and version", () => {
  const cookie = createAdminSessionCookie({
    id: "admin-1",
    email: "Admin@Example.com",
    sessionVersion: 3,
  }).split(";")[0];

  assert.deepEqual(readAdminSession({ headers: { cookie } }), {
    id: "admin-1",
    email: "admin@example.com",
    sessionVersion: 3,
  });
});

test("super admin and temporary-password guards enforce access", () => {
  assert.equal(runGuard(requireSuperAdmin, { isSuperAdmin: true }).nextCalled, true);
  assert.equal(runGuard(requireSuperAdmin, { isSuperAdmin: false }).statusCode, 403);
  assert.equal(runGuard(requireCompletedPasswordChange, { mustChangePassword: false }).nextCalled, true);
  assert.equal(runGuard(requireCompletedPasswordChange, { mustChangePassword: true }).statusCode, 403);
});

function runGuard(guard, admin) {
  const result = { statusCode: null, body: null, nextCalled: false };
  const response = {
    status(statusCode) {
      result.statusCode = statusCode;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };
  guard({ admin }, response, () => {
    result.nextCalled = true;
  });
  return result;
}
