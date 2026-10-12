import { randomBytes, randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import {
  createUser,
  CSRF_HEADER_NAME,
  csrfCookie,
  DEFAULT_TEST_PASSWORD,
  extractCookieValue,
  insertRefreshToken,
  LEGACY_SCRYPT_KEY_LEN,
  scryptAsync,
  TEST_CSRF_TOKEN,
  waitForPasswordHashUpgrade,
} from "#test/integration/auth-fixtures.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

import {
  LOGIN_EMAIL_RATE_LIMIT_MAX_REQUESTS,
  LOGIN_IP_RATE_LIMIT_MAX_REQUESTS,
  LOGIN_LOCKOUT_THRESHOLD,
  REFRESH_IP_RATE_LIMIT_MAX_REQUESTS,
} from "../auth.constants.js";

describe("POST /api/auth/login", () => {
  it("rejects a password-login attempt for an oauth-only account with the same generic error", async () => {
    const suffix = randomUUID().slice(0, 8);
    const oauthOnlyUser = await prisma.user.create({
      data: {
        email: `oauth-only-${suffix}@outfiqe.test`,
        name: "OAuth Only User",
        handle: `oauth-only-${suffix}`,
        phone: uniquePhone(),
        passwordHash: null,
        emailVerified: true,
      },
    });

    const response = await request(testApp)
      .post("/api/auth/login")
      .send({ email: oauthOnlyUser.email, password: "any-password-at-all" });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("INVALID_CREDENTIALS");
  });

  it("logs in a verified user and issues session cookies", async () => {
    const { user, password } = await createUser({ emailVerified: true });

    const response = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty("accessToken");
    expect(response.body.data.user).toMatchObject({ id: user.id, email: user.email });
    expect(extractCookieValue(response, "refresh_token")).toBeTruthy();
    expect(extractCookieValue(response, "has_session")).toBe("1");
  });

  it("logs in a user with a legacy scrypt hash and silently upgrades it to argon2id", async () => {
    const suffix = randomUUID().slice(0, 8);
    const password = DEFAULT_TEST_PASSWORD;
    const salt = randomBytes(16);
    const derived = await scryptAsync(password, salt, LEGACY_SCRYPT_KEY_LEN);
    const legacyHash = `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;

    const user = await prisma.user.create({
      data: {
        email: `legacy-${suffix}@outfiqe.test`,
        name: "Legacy Hash User",
        handle: `legacy-user-${suffix}`,
        phone: uniquePhone(),
        passwordHash: legacyHash,
        emailVerified: true,
      },
    });

    const response = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password });

    expect(response.status).toBe(200);

    const upgradedHash = await waitForPasswordHashUpgrade(user.id);
    expect(upgradedHash).toMatch(/^\$argon2id\$/);
  });

  it("rejects an unverified user", async () => {
    const { user, password } = await createUser({ emailVerified: false });

    const response = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("rejects an incorrect password", async () => {
    const { user } = await createUser({ emailVerified: true });

    const response = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password: "wrong-password" });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects an unknown email", async () => {
    const response = await request(testApp)
      .post("/api/auth/login")
      .send({ email: `nobody-${randomUUID()}@outfiqe.test`, password: DEFAULT_TEST_PASSWORD });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("INVALID_CREDENTIALS");
  });

  it("rate limits repeated login attempts against the same account", async () => {
    const { user } = await createUser({ emailVerified: true });

    for (let attempt = 0; attempt < LOGIN_EMAIL_RATE_LIMIT_MAX_REQUESTS; attempt += 1) {
      const response = await request(testApp)
        .post("/api/auth/login")
        .send({ email: user.email, password: "wrong-password" });
      expect(response.status).toBe(401);
    }

    const limited = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password: "wrong-password" });

    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe("RATE_LIMITED");
  });

  it("rate limits repeated login attempts from the same ip across different accounts", async () => {
    for (let attempt = 0; attempt < LOGIN_IP_RATE_LIMIT_MAX_REQUESTS; attempt += 1) {
      const response = await request(testApp)
        .post("/api/auth/login")
        .send({ email: `nobody-${randomUUID()}@outfiqe.test`, password: "wrong-password" });
      expect(response.status).toBe(401);
    }

    const limited = await request(testApp)
      .post("/api/auth/login")
      .send({ email: `nobody-${randomUUID()}@outfiqe.test`, password: "wrong-password" });

    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe("RATE_LIMITED");
  });

  it("locks out an account after repeated failed attempts, returning the same generic error even with the correct password", async () => {
    const { user, password } = await createUser({ emailVerified: true });

    for (let attempt = 0; attempt < LOGIN_LOCKOUT_THRESHOLD; attempt += 1) {
      const response = await request(testApp)
        .post("/api/auth/login")
        .send({ email: user.email, password: "wrong-password" });
      expect(response.status).toBe(401);
      expect(response.body.code).toBe("INVALID_CREDENTIALS");
    }

    const lockedOut = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password });

    expect(lockedOut.status).toBe(401);
    expect(lockedOut.body.code).toBe("INVALID_CREDENTIALS");
  });

  it("resets the lockout counter after a successful login", async () => {
    const { user, password } = await createUser({ emailVerified: true });
    const halfThreshold = Math.floor(LOGIN_LOCKOUT_THRESHOLD / 2);

    for (let attempt = 0; attempt < halfThreshold; attempt += 1) {
      await request(testApp)
        .post("/api/auth/login")
        .send({ email: user.email, password: "wrong-password" });
    }

    const success = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password });
    expect(success.status).toBe(200);

    for (let attempt = 0; attempt < halfThreshold; attempt += 1) {
      const response = await request(testApp)
        .post("/api/auth/login")
        .send({ email: user.email, password: "wrong-password" });
      expect(response.status).toBe(401);
      expect(response.body.code).toBe("INVALID_CREDENTIALS");
    }

    const stillNotLockedOut = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password });
    expect(stillNotLockedOut.status).toBe(200);
  });

  it("scopes lockout to the targeted account, not every account", async () => {
    const { user: targetUser } = await createUser({ emailVerified: true });
    const { user: otherUser, password: otherPassword } = await createUser({ emailVerified: true });

    for (let attempt = 0; attempt < LOGIN_LOCKOUT_THRESHOLD; attempt += 1) {
      await request(testApp)
        .post("/api/auth/login")
        .send({ email: targetUser.email, password: "wrong-password" });
    }

    const otherLogin = await request(testApp)
      .post("/api/auth/login")
      .send({ email: otherUser.email, password: otherPassword });

    expect(otherLogin.status).toBe(200);
  });
});

describe("POST /api/auth/refresh", () => {
  it("rejects a missing refresh token", async () => {
    const response = await request(testApp).post("/api/auth/refresh");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("MISSING_TOKEN");
  });

  it("rejects an unknown refresh token", async () => {
    const response = await request(testApp)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${generateOpaqueToken()}`, csrfCookie()])
      .set(CSRF_HEADER_NAME, TEST_CSRF_TOKEN);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("INVALID_TOKEN");
  });

  it("rejects an expired refresh token and deletes it", async () => {
    const { user } = await createUser();
    const rawToken = await insertRefreshToken(user.id, { expired: true });

    const response = await request(testApp)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${rawToken}`, csrfCookie()])
      .set(CSRF_HEADER_NAME, TEST_CSRF_TOKEN);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("TOKEN_EXPIRED");

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });
    expect(stored).toBeNull();
  });

  it("rotates the refresh token, issuing a new pair and invalidating the old one", async () => {
    const { user } = await createUser();
    const rawToken = await insertRefreshToken(user.id);

    const response = await request(testApp)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${rawToken}`, csrfCookie()])
      .set(CSRF_HEADER_NAME, TEST_CSRF_TOKEN);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty("accessToken");
    const rotatedToken = extractCookieValue(response, "refresh_token");
    expect(rotatedToken).toBeTruthy();
    expect(rotatedToken).not.toBe(rawToken);

    const reuse = await request(testApp)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${rawToken}`, csrfCookie()])
      .set(CSRF_HEADER_NAME, TEST_CSRF_TOKEN);

    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe("TOKEN_REUSE_DETECTED");
  });

  it("revokes the entire token family when a rotated-out token is replayed", async () => {
    const { user } = await createUser();
    const rawToken = await insertRefreshToken(user.id);

    const rotateResponse = await request(testApp)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${rawToken}`, csrfCookie()])
      .set(CSRF_HEADER_NAME, TEST_CSRF_TOKEN);
    expect(rotateResponse.status).toBe(200);

    const rotatedOutRecord = await prisma.refreshToken.findUniqueOrThrow({
      where: { tokenHash: hashToken(rawToken) },
    });
    expect(rotatedOutRecord.revokedAt).not.toBeNull();

    const siblingToken = await insertRefreshToken(user.id, {
      familyId: rotatedOutRecord.familyId,
    });

    const reuseResponse = await request(testApp)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${rawToken}`, csrfCookie()])
      .set(CSRF_HEADER_NAME, TEST_CSRF_TOKEN);

    expect(reuseResponse.status).toBe(401);
    expect(reuseResponse.body.code).toBe("TOKEN_REUSE_DETECTED");

    const siblingLookup = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(siblingToken) },
    });
    expect(siblingLookup).toBeNull();

    const rotatedCookieValue = extractCookieValue(rotateResponse, "refresh_token");
    const currentTokenLookup = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rotatedCookieValue ?? "") },
    });
    expect(currentTokenLookup).toBeNull();
  });

  it("rate limits repeated refresh attempts from the same ip", async () => {
    for (let attempt = 0; attempt < REFRESH_IP_RATE_LIMIT_MAX_REQUESTS; attempt += 1) {
      const response = await request(testApp)
        .post("/api/auth/refresh")
        .set("Cookie", [`refresh_token=${generateOpaqueToken()}`, csrfCookie()])
        .set(CSRF_HEADER_NAME, TEST_CSRF_TOKEN);
      expect(response.status).toBe(401);
    }

    const limited = await request(testApp)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${generateOpaqueToken()}`, csrfCookie()])
      .set(CSRF_HEADER_NAME, TEST_CSRF_TOKEN);

    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe("RATE_LIMITED");
  });

  it("rejects a refresh request with a mismatched csrf header", async () => {
    const { user } = await createUser();
    const rawToken = await insertRefreshToken(user.id);

    const response = await request(testApp)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${rawToken}`, csrfCookie()])
      .set(CSRF_HEADER_NAME, "a-completely-different-token");

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CSRF_MISMATCH");
  });

  it("rejects a refresh request with no csrf header at all", async () => {
    const { user } = await createUser();
    const rawToken = await insertRefreshToken(user.id);

    const response = await request(testApp)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${rawToken}`, csrfCookie()]);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CSRF_MISMATCH");
  });
});

describe("POST /api/auth/session", () => {
  it("rejects a missing refresh token", async () => {
    const response = await request(testApp).post("/api/auth/session");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("MISSING_TOKEN");
  });

  it("issues a fresh access token without rotating the refresh token", async () => {
    const { user } = await createUser();
    const rawToken = await insertRefreshToken(user.id);

    const first = await request(testApp)
      .post("/api/auth/session")
      .set("Cookie", [`refresh_token=${rawToken}`]);
    const second = await request(testApp)
      .post("/api/auth/session")
      .set("Cookie", [`refresh_token=${rawToken}`]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.data).toHaveProperty("accessToken");
  });

  it("returns the current user's profile alongside the access token", async () => {
    const { user } = await createUser({ emailVerified: true });
    const rawToken = await insertRefreshToken(user.id);

    const response = await request(testApp)
      .post("/api/auth/session")
      .set("Cookie", [`refresh_token=${rawToken}`]);

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: UserRole.CUSTOMER,
      hasPassword: true,
    });
  });

  it("rejects a token that has already been rotated out", async () => {
    const { user } = await createUser();
    const rawToken = await insertRefreshToken(user.id, { revoked: true });

    const response = await request(testApp)
      .post("/api/auth/session")
      .set("Cookie", [`refresh_token=${rawToken}`]);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("INVALID_TOKEN");
  });
});

describe("POST /api/auth/logout", () => {
  it("succeeds silently with no refresh token", async () => {
    const response = await request(testApp).post("/api/auth/logout");

    expect(response.status).toBe(200);
  });

  it("invalidates the refresh token and clears cookies", async () => {
    const { user } = await createUser();
    const rawToken = await insertRefreshToken(user.id);

    const response = await request(testApp)
      .post("/api/auth/logout")
      .set("Cookie", [`refresh_token=${rawToken}`, csrfCookie()])
      .set(CSRF_HEADER_NAME, TEST_CSRF_TOKEN);

    expect(response.status).toBe(200);

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });
    expect(stored).toBeNull();

    const refreshAfterLogout = await request(testApp)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${rawToken}`, csrfCookie()])
      .set(CSRF_HEADER_NAME, TEST_CSRF_TOKEN);
    expect(refreshAfterLogout.status).toBe(401);
  });

  it("rejects a logout request with a mismatched csrf header", async () => {
    const { user } = await createUser();
    const rawToken = await insertRefreshToken(user.id);

    const response = await request(testApp)
      .post("/api/auth/logout")
      .set("Cookie", [`refresh_token=${rawToken}`, csrfCookie()])
      .set(CSRF_HEADER_NAME, "a-completely-different-token");

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CSRF_MISMATCH");

    const stillStored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });
    expect(stillStored).not.toBeNull();
  });
});
