import { randomBytes, randomUUID, scrypt } from "node:crypto";
import { promisify } from "node:util";

import { addHours } from "date-fns/addHours";
import { subHours } from "date-fns/subHours";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { TokenPurpose } from "#constants/enums/auth.enum.js";
import { prisma } from "#db/prisma.js";
import { BrandRole, UserRole } from "#generated/prisma/enums.js";
import { generateToken } from "#lib/generate-token.utils.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import { hashPassword } from "#lib/password.utils.js";
import { signPurposeToken } from "#lib/purpose-token.utils.js";
import { seedPlatformOrganization, seedTenantOrganization } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import {
  FORGOT_PASSWORD_MAX_REQUESTS,
  LOGIN_EMAIL_RATE_LIMIT_MAX_REQUESTS,
  LOGIN_IP_RATE_LIMIT_MAX_REQUESTS,
  LOGIN_LOCKOUT_THRESHOLD,
  REFRESH_IP_RATE_LIMIT_MAX_REQUESTS,
  REGISTER_IP_RATE_LIMIT_MAX_REQUESTS,
  RESET_PASSWORD_IP_RATE_LIMIT_MAX_REQUESTS,
} from "./auth.constants.js";

const DEFAULT_TEST_PASSWORD = "correct-horse-battery";
const DEFAULT_TOKEN_TTL = "1h";
const EXPIRED_TOKEN_TTL = "-1h";
const LEGACY_SCRYPT_KEY_LEN = 64;
const PASSWORD_UPGRADE_POLL_INTERVAL_MS = 25;
const PASSWORD_UPGRADE_POLL_ATTEMPTS = 40;
const CSRF_HEADER_NAME = "X-CSRF-Token";
const TEST_CSRF_TOKEN = "test-csrf-token";
const csrfCookie = () => `csrf_token=${TEST_CSRF_TOKEN}`;

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForPasswordHashUpgrade = async (userId: string): Promise<string> => {
  for (let attempt = 0; attempt < PASSWORD_UPGRADE_POLL_ATTEMPTS; attempt += 1) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.passwordHash?.startsWith("$argon2id$")) return user.passwordHash;
    await wait(PASSWORD_UPGRADE_POLL_INTERVAL_MS);
  }

  throw new Error(`Password hash for user ${userId} was not upgraded in time`);
};

const mintPurposeToken = (userId: string, purpose: TokenPurpose, ttl = DEFAULT_TOKEN_TTL): string =>
  signPurposeToken({ sub: userId, purpose }, ttl);

const createUser = async (overrides: { emailVerified?: boolean; password?: string } = {}) => {
  const suffix = randomUUID().slice(0, 8);
  const password = overrides.password ?? DEFAULT_TEST_PASSWORD;

  const user = await prisma.user.create({
    data: {
      email: `user-${suffix}@outfiqe.test`,
      name: "Test User",
      handle: `test-user-${suffix}`,
      phone: uniquePhone(),
      passwordHash: await hashPassword(password),
      emailVerified: overrides.emailVerified ?? true,
    },
  });

  return { user, password };
};

const registerBody = (overrides: Partial<Record<string, string>> = {}) => ({
  name: "Ava Martinez",
  email: `register-${randomUUID()}@outfiqe.test`,
  phone: uniquePhone(),
  password: DEFAULT_TEST_PASSWORD,
  confirmPassword: DEFAULT_TEST_PASSWORD,
  ...overrides,
});

const createAdminInvite = async (overrides: { email?: string; name?: string } = {}) => {
  const { user: inviter } = await createUser();
  const rawToken = generateOpaqueToken();

  await prisma.adminInvite.create({
    data: {
      email: overrides.email ?? `admin-invite-${randomUUID()}@outfiqe.test`,
      name: overrides.name ?? "New Admin",
      tokenHash: hashToken(rawToken),
      expiresAt: addHours(new Date(), 1),
      invitedById: inviter.id,
    },
  });

  return rawToken;
};

const createCrmInvite = async (overrides: { email?: string; expiresAt?: Date } = {}) => {
  const { organization, memberRole } = await seedTenantOrganization();
  const { user: inviter } = await createUser();
  const rawToken = generateOpaqueToken();

  const invite = await prisma.organizationInvite.create({
    data: {
      organizationId: organization.id,
      email: overrides.email ?? `crm-invitee-${randomUUID()}@outfiqe.test`,
      roleId: memberRole.id,
      tokenHash: hashToken(rawToken),
      expiresAt: overrides.expiresAt ?? addHours(new Date(), 1),
      invitedById: inviter.id,
    },
  });

  return { rawToken, invite, organization, memberRole };
};

const extractCookieValue = (response: request.Response, cookieName: string): string | undefined => {
  const rawCookies = response.headers["set-cookie"];
  const cookies = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
  const match = cookies.find((cookie) => cookie.startsWith(`${cookieName}=`));
  if (!match) return undefined;

  const valueWithAttributes = match.slice(cookieName.length + 1);
  return valueWithAttributes.split(";")[0];
};

const insertRefreshToken = async (
  userId: string,
  {
    expired = false,
    revoked = false,
    familyId = randomUUID(),
  }: { expired?: boolean; revoked?: boolean; familyId?: string } = {},
) => {
  const rawToken = generateOpaqueToken();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      familyId,
      expiresAt: expired ? subHours(new Date(), 1) : addHours(new Date(), 1),
      revokedAt: revoked ? new Date() : null,
    },
  });

  return rawToken;
};

describe("POST /api/auth/register", () => {
  it("creates an unverified user and returns their id", async () => {
    const body = registerBody();

    const response = await request(testApp).post("/api/auth/register").send(body);

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty("userId");

    const stored = await prisma.user.findUnique({ where: { email: body.email } });
    expect(stored).toMatchObject({ name: body.name, emailVerified: false });
  });

  it("rejects a duplicate email", async () => {
    const body = registerBody();
    await request(testApp).post("/api/auth/register").send(body);

    const response = await request(testApp)
      .post("/api/auth/register")
      .send(registerBody({ email: body.email }));

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("USER_EXISTS");
  });

  it("rejects a duplicate phone number", async () => {
    const body = registerBody();
    await request(testApp).post("/api/auth/register").send(body);

    const response = await request(testApp)
      .post("/api/auth/register")
      .send(registerBody({ phone: body.phone }));

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("PHONE_EXISTS");
  });

  it("rejects mismatched passwords", async () => {
    const response = await request(testApp)
      .post("/api/auth/register")
      .send(registerBody({ confirmPassword: "something-else" }));

    expect(response.status).toBe(422);
  });

  it("rejects an invalid phone number", async () => {
    const response = await request(testApp)
      .post("/api/auth/register")
      .send(registerBody({ phone: "12345" }));

    expect(response.status).toBe(422);
  });

  it("rate limits repeated registration attempts from the same ip", async () => {
    for (let attempt = 0; attempt < REGISTER_IP_RATE_LIMIT_MAX_REQUESTS; attempt += 1) {
      const response = await request(testApp).post("/api/auth/register").send(registerBody());
      expect(response.status).toBe(201);
    }

    const limited = await request(testApp).post("/api/auth/register").send(registerBody());

    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe("RATE_LIMITED");
  });
});

describe("POST /api/auth/register/admin", () => {
  it("grants immediate platform access to a newly registered admin", async () => {
    await seedPlatformOrganization();
    const inviteToken = await createAdminInvite();

    const response = await request(testApp).post("/api/auth/register/admin").send({
      inviteToken,
      phone: uniquePhone(),
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
    });

    expect(response.status).toBe(201);

    const { accessToken } = response.body.data;
    const platformResponse = await request(testApp)
      .get("/api/admin/financial-rollup")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(platformResponse.status).toBe(200);
  });
});

describe("GET /api/auth/invite/crm", () => {
  it("returns the org and role for a pending invite that needs registration", async () => {
    const { rawToken, invite, organization, memberRole } = await createCrmInvite();

    const response = await request(testApp).get("/api/auth/invite/crm").query({ token: rawToken });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      email: invite.email,
      organizationName: organization.name,
      roleName: memberRole.name,
      requiresRegistration: true,
    });
  });

  it("rejects an expired invite token", async () => {
    const { rawToken } = await createCrmInvite({ expiresAt: subHours(new Date(), 1) });

    const response = await request(testApp).get("/api/auth/invite/crm").query({ token: rawToken });

    expect(response.status).toBe(409);
  });

  it("rejects an unknown token", async () => {
    const response = await request(testApp)
      .get("/api/auth/invite/crm")
      .query({ token: generateOpaqueToken() });

    expect(response.status).toBe(404);
  });
});

describe("POST /api/auth/register/crm-invite", () => {
  it("creates a tenant-only admin account and grants CRM access without platform access", async () => {
    const { rawToken, invite, organization, memberRole } = await createCrmInvite();

    const response = await request(testApp).post("/api/auth/register/crm-invite").send({
      inviteToken: rawToken,
      name: "Sujata Rai",
      phone: uniquePhone(),
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
    });

    expect(response.status).toBe(201);

    const { accessToken, user } = response.body.data;
    expect(user).toMatchObject({
      role: UserRole.ADMIN,
      hasPlatformAccess: false,
      hasCrmAccess: true,
    });

    const createdUser = await prisma.user.findUniqueOrThrow({ where: { email: invite.email } });
    expect(createdUser.emailVerified).toBe(true);

    const membership = await prisma.membership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: createdUser.id, organizationId: organization.id } },
    });
    expect(membership).toMatchObject({ roleId: memberRole.id, status: "ACTIVE" });

    const consumedInvite = await prisma.organizationInvite.findUniqueOrThrow({
      where: { id: invite.id },
    });
    expect(consumedInvite.acceptedAt).not.toBeNull();

    const platformResponse = await request(testApp)
      .get("/api/admin/financial-rollup")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(platformResponse.status).toBe(403);
  });

  it("rejects a second registration with the same invite token", async () => {
    const { rawToken } = await createCrmInvite();

    const first = await request(testApp).post("/api/auth/register/crm-invite").send({
      inviteToken: rawToken,
      name: "First Taker",
      phone: uniquePhone(),
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
    });
    expect(first.status).toBe(201);

    const second = await request(testApp).post("/api/auth/register/crm-invite").send({
      inviteToken: rawToken,
      name: "Second Taker",
      phone: uniquePhone(),
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
    });
    expect(second.status).toBe(409);
  });

  it("rejects registration when the invite email already has an account", async () => {
    const { rawToken, invite } = await createCrmInvite();
    await prisma.user.create({
      data: {
        email: invite.email,
        name: "Already Here",
        handle: `already-here-${randomUUID().slice(0, 8)}`,
        phone: uniquePhone(),
        passwordHash: await hashPassword(DEFAULT_TEST_PASSWORD),
        emailVerified: true,
      },
    });

    const response = await request(testApp).post("/api/auth/register/crm-invite").send({
      inviteToken: rawToken,
      name: "Late Comer",
      phone: uniquePhone(),
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
    });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("USER_EXISTS");
  });

  it("rejects registration when the phone number already belongs to another account", async () => {
    const { rawToken } = await createCrmInvite();
    const takenPhone = uniquePhone();
    await prisma.user.create({
      data: {
        email: `phone-owner-${randomUUID()}@outfiqe.test`,
        name: "Phone Owner",
        handle: `phone-owner-${randomUUID().slice(0, 8)}`,
        phone: takenPhone,
        passwordHash: await hashPassword(DEFAULT_TEST_PASSWORD),
        emailVerified: true,
      },
    });

    const response = await request(testApp).post("/api/auth/register/crm-invite").send({
      inviteToken: rawToken,
      name: "Phone Clash",
      phone: takenPhone,
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
    });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("PHONE_EXISTS");
  });
});

describe("POST /api/auth/verify-email", () => {
  it("marks the user's email verified", async () => {
    const { user } = await createUser({ emailVerified: false });
    const token = mintPurposeToken(user.id, TokenPurpose.EMAIL_VERIFICATION);

    const response = await request(testApp).post("/api/auth/verify-email").send({ token });

    expect(response.status).toBe(200);
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.emailVerified).toBe(true);
  });

  it("is a no-op for an already-verified user", async () => {
    const { user } = await createUser({ emailVerified: true });
    const token = mintPurposeToken(user.id, TokenPurpose.EMAIL_VERIFICATION);

    const response = await request(testApp).post("/api/auth/verify-email").send({ token });

    expect(response.status).toBe(200);
  });

  it("allows exactly one success when the same verification token is submitted concurrently", async () => {
    const { user } = await createUser({ emailVerified: false });
    const token = mintPurposeToken(user.id, TokenPurpose.EMAIL_VERIFICATION);

    const [first, second] = await Promise.all([
      request(testApp).post("/api/auth/verify-email").send({ token }),
      request(testApp).post("/api/auth/verify-email").send({ token }),
    ]);

    expect([first.status, second.status]).toContain(200);

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.emailVerified).toBe(true);

    const usedTokenRowCount = await prisma.usedPurposeToken.count();
    expect(usedTokenRowCount).toBe(1);
  });

  it("rejects an expired token", async () => {
    const { user } = await createUser({ emailVerified: false });
    const token = mintPurposeToken(user.id, TokenPurpose.EMAIL_VERIFICATION, EXPIRED_TOKEN_TTL);

    const response = await request(testApp).post("/api/auth/verify-email").send({ token });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("TOKEN_EXPIRED");
  });

  it("rejects a token minted for the wrong purpose", async () => {
    const { user } = await createUser({ emailVerified: false });
    const token = mintPurposeToken(user.id, TokenPurpose.PASSWORD_RESET);

    const response = await request(testApp).post("/api/auth/verify-email").send({ token });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_TOKEN");
  });

  it("returns the same generic invalid-token response when the token's user no longer exists", async () => {
    const token = mintPurposeToken(randomUUID(), TokenPurpose.EMAIL_VERIFICATION);

    const response = await request(testApp).post("/api/auth/verify-email").send({ token });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_TOKEN");
  });
});

describe("POST /api/auth/resend-verification", () => {
  it("returns success without leaking whether the email is registered", async () => {
    const response = await request(testApp)
      .post("/api/auth/resend-verification")
      .send({ email: `nobody-${randomUUID()}@outfiqe.test` });

    expect(response.status).toBe(200);
  });

  it("is a no-op for an already-verified user", async () => {
    const { user } = await createUser({ emailVerified: true });

    const response = await request(testApp)
      .post("/api/auth/resend-verification")
      .send({ email: user.email });

    expect(response.status).toBe(200);
  });
});

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

describe("POST /api/auth/forgot-password", () => {
  it("returns success without leaking whether the email is registered", async () => {
    const response = await request(testApp)
      .post("/api/auth/forgot-password")
      .send({ email: `nobody-${randomUUID()}@outfiqe.test` });

    expect(response.status).toBe(200);
  });

  it("returns success for a registered email", async () => {
    const { user } = await createUser();

    const response = await request(testApp)
      .post("/api/auth/forgot-password")
      .send({ email: user.email });

    expect(response.status).toBe(200);
  });

  it("rate limits repeated requests for the same email", async () => {
    const { user } = await createUser();

    for (let attempt = 0; attempt < FORGOT_PASSWORD_MAX_REQUESTS; attempt += 1) {
      const response = await request(testApp)
        .post("/api/auth/forgot-password")
        .send({ email: user.email });
      expect(response.status).toBe(200);
    }

    const limited = await request(testApp)
      .post("/api/auth/forgot-password")
      .send({ email: user.email });

    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe("RATE_LIMITED");
  });
});

describe("POST /api/auth/reset-password", () => {
  it("updates the password and invalidates existing sessions", async () => {
    const { user } = await createUser();
    await insertRefreshToken(user.id);
    const token = mintPurposeToken(user.id, TokenPurpose.PASSWORD_RESET);
    const newPassword = "brand-new-password";

    const response = await request(testApp)
      .post("/api/auth/reset-password")
      .send({ token, password: newPassword, confirmPassword: newPassword });

    expect(response.status).toBe(200);

    const remainingTokens = await prisma.refreshToken.findMany({ where: { userId: user.id } });
    expect(remainingTokens).toHaveLength(0);

    const login = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password: newPassword });
    expect(login.status).toBe(200);
  });

  it("rejects an expired token", async () => {
    const { user } = await createUser();
    const token = mintPurposeToken(user.id, TokenPurpose.PASSWORD_RESET, EXPIRED_TOKEN_TTL);

    const response = await request(testApp)
      .post("/api/auth/reset-password")
      .send({ token, password: "whatever123", confirmPassword: "whatever123" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("TOKEN_EXPIRED");
  });

  it("rejects mismatched passwords", async () => {
    const { user } = await createUser();
    const token = mintPurposeToken(user.id, TokenPurpose.PASSWORD_RESET);

    const response = await request(testApp)
      .post("/api/auth/reset-password")
      .send({ token, password: "whatever123", confirmPassword: "different456" });

    expect(response.status).toBe(422);
  });

  it("returns the same generic invalid-token response when the token's user no longer exists", async () => {
    const token = mintPurposeToken(randomUUID(), TokenPurpose.PASSWORD_RESET);

    const response = await request(testApp)
      .post("/api/auth/reset-password")
      .send({ token, password: "whatever123", confirmPassword: "whatever123" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_TOKEN");
  });

  it("rejects replaying an already-used reset token", async () => {
    const { user } = await createUser();
    const token = mintPurposeToken(user.id, TokenPurpose.PASSWORD_RESET);

    const first = await request(testApp)
      .post("/api/auth/reset-password")
      .send({ token, password: "brand-new-password", confirmPassword: "brand-new-password" });
    expect(first.status).toBe(200);

    const replay = await request(testApp)
      .post("/api/auth/reset-password")
      .send({ token, password: "another-password", confirmPassword: "another-password" });

    expect(replay.status).toBe(400);
    expect(replay.body.code).toBe("INVALID_TOKEN");
  });

  it("allows exactly one success when the same reset token is submitted concurrently", async () => {
    const { user } = await createUser();
    const token = mintPurposeToken(user.id, TokenPurpose.PASSWORD_RESET);

    const [first, second] = await Promise.all([
      request(testApp).post("/api/auth/reset-password").send({
        token,
        password: "concurrent-password-a",
        confirmPassword: "concurrent-password-a",
      }),
      request(testApp).post("/api/auth/reset-password").send({
        token,
        password: "concurrent-password-b",
        confirmPassword: "concurrent-password-b",
      }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 400]);

    const [loser] = [first, second].filter((response) => response.status === 400);
    if (!loser) throw new Error("Expected exactly one of the concurrent resets to lose the race");
    expect(loser.body.code).toBe("INVALID_TOKEN");

    const usedTokenRowCount = await prisma.usedPurposeToken.count();
    expect(usedTokenRowCount).toBe(1);
  });

  it("rate limits repeated reset-password attempts from the same ip", async () => {
    for (let attempt = 0; attempt < RESET_PASSWORD_IP_RATE_LIMIT_MAX_REQUESTS; attempt += 1) {
      const token = mintPurposeToken(randomUUID(), TokenPurpose.PASSWORD_RESET);
      const response = await request(testApp)
        .post("/api/auth/reset-password")
        .send({ token, password: "whatever123", confirmPassword: "whatever123" });
      expect(response.status).toBe(400);
    }

    const token = mintPurposeToken(randomUUID(), TokenPurpose.PASSWORD_RESET);
    const limited = await request(testApp)
      .post("/api/auth/reset-password")
      .send({ token, password: "whatever123", confirmPassword: "whatever123" });

    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe("RATE_LIMITED");
  });
});

describe("GET /api/auth/me", () => {
  it("requires authentication", async () => {
    const response = await request(testApp).get("/api/auth/me");

    expect(response.status).toBe(401);
  });

  it("returns the authenticated user's profile", async () => {
    const { user, password } = await createUser({ emailVerified: true });
    const login = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password });
    const accessToken: string = login.body.data.accessToken;

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: UserRole.CUSTOMER,
      hasPassword: true,
    });
  });

  it("reports hasPassword false for an oauth-only account with no password", async () => {
    const suffix = randomUUID().slice(0, 8);
    const oauthOnlyUser = await prisma.user.create({
      data: {
        email: `oauth-only-${suffix}@outfiqe.test`,
        name: "OAuth Only",
        handle: `oauth-only-${suffix}`,
        phone: null,
        passwordHash: null,
        emailVerified: true,
      },
    });
    const accessToken = generateToken({ sub: oauthOnlyUser.id, role: oauthOnlyUser.role });

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ phone: null, hasPassword: false });
  });

  it("reports hasPlatformAccess false for a customer account", async () => {
    const { user, password } = await createUser({ emailVerified: true });
    const login = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password });
    const accessToken: string = login.body.data.accessToken;

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ hasPlatformAccess: false });
  });

  it("reports hasPlatformAccess false for an admin account with no CRM membership", async () => {
    const suffix = randomUUID().slice(0, 8);
    const adminUser = await prisma.user.create({
      data: {
        email: `admin-no-crm-${suffix}@outfiqe.test`,
        name: "Admin No CRM",
        handle: `admin-no-crm-${suffix}`,
        phone: null,
        passwordHash: null,
        role: UserRole.ADMIN,
        emailVerified: true,
      },
    });
    const accessToken = generateToken({ sub: adminUser.id, role: adminUser.role });

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ hasPlatformAccess: false });
  });

  it("includes hasPlatformAccess for a brand owner account, so apps/admin can sign them in", async () => {
    const suffix = randomUUID().slice(0, 8);
    const brandOwner = await prisma.user.create({
      data: {
        email: `brand-owner-${suffix}@outfiqe.test`,
        name: "Brand Owner",
        handle: `brand-owner-${suffix}`,
        phone: uniquePhone(),
        passwordHash: null,
        role: UserRole.BRAND_OWNER,
        emailVerified: true,
      },
    });
    const brand = await prisma.brand.create({
      data: {
        name: "Test Brand",
        contactName: "Brand Contact",
        email: `brand-${suffix}@outfiqe.test`,
        phone: uniquePhone(),
        instagram: `@${suffix}`,
      },
    });
    await prisma.brandMembership.create({
      data: { userId: brandOwner.id, brandId: brand.id, role: BrandRole.OWNER },
    });
    const accessToken = generateToken({ sub: brandOwner.id, role: brandOwner.role });

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      role: UserRole.BRAND_OWNER,
      brandId: brand.id,
      hasPlatformAccess: false,
    });
  });

  it("reports hasCrmAccess false for a customer with no CRM membership", async () => {
    const { user, password } = await createUser({ emailVerified: true });
    const login = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password });

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.data.accessToken as string}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ hasCrmAccess: false });
  });

  it("reports hasCrmAccess true for an account with an active CRM membership", async () => {
    const suffix = randomUUID().slice(0, 8);
    const crmUser = await prisma.user.create({
      data: {
        email: `crm-member-${suffix}@outfiqe.test`,
        name: "CRM Member",
        handle: `crm-member-${suffix}`,
        phone: uniquePhone(),
        passwordHash: null,
        role: UserRole.BRAND_OWNER,
        emailVerified: true,
      },
    });
    const { organization, adminRole } = await seedTenantOrganization();
    await prisma.membership.create({
      data: {
        userId: crmUser.id,
        organizationId: organization.id,
        roleId: adminRole.id,
        status: "ACTIVE",
      },
    });
    const accessToken = generateToken({ sub: crmUser.id, role: crmUser.role });

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ hasCrmAccess: true });
  });

  it("reports hasCrmAccess false when the only CRM membership is deactivated", async () => {
    const suffix = randomUUID().slice(0, 8);
    const crmUser = await prisma.user.create({
      data: {
        email: `crm-deactivated-${suffix}@outfiqe.test`,
        name: "Deactivated CRM Member",
        handle: `crm-deactivated-${suffix}`,
        phone: uniquePhone(),
        passwordHash: null,
        role: UserRole.BRAND_OWNER,
        emailVerified: true,
      },
    });
    const { organization, memberRole } = await seedTenantOrganization();
    await prisma.membership.create({
      data: {
        userId: crmUser.id,
        organizationId: organization.id,
        roleId: memberRole.id,
        status: "DEACTIVATED",
      },
    });
    const accessToken = generateToken({ sub: crmUser.id, role: crmUser.role });

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ hasCrmAccess: false });
  });

  it("includes a brand owner's real phone number, instead of always reporting none", async () => {
    const suffix = randomUUID().slice(0, 8);
    const phone = uniquePhone();
    const brandOwner = await prisma.user.create({
      data: {
        email: `brand-owner-${suffix}@outfiqe.test`,
        name: "Brand Owner",
        handle: `brand-owner-${suffix}`,
        phone,
        passwordHash: null,
        role: UserRole.BRAND_OWNER,
        emailVerified: true,
      },
    });
    const brand = await prisma.brand.create({
      data: {
        name: "Test Brand",
        contactName: "Brand Contact",
        email: `brand-${suffix}@outfiqe.test`,
        phone: uniquePhone(),
        instagram: `@${suffix}`,
      },
    });
    await prisma.brandMembership.create({
      data: { userId: brandOwner.id, brandId: brand.id, role: BrandRole.OWNER },
    });
    const accessToken = generateToken({ sub: brandOwner.id, role: brandOwner.role });

    const response = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ phone });
  });
});
