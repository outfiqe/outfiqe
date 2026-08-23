import { randomBytes, randomUUID, scrypt } from "node:crypto";
import { promisify } from "node:util";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { TokenPurpose } from "#constants/enums/auth.enum.js";
import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import { hashPassword } from "#lib/password.utils.js";
import { signPurposeToken } from "#lib/purpose-token.utils.js";
import { testApp } from "#test/integration/testApp.js";

const DEFAULT_TEST_PASSWORD = "correct-horse-battery";
const DEFAULT_TOKEN_TTL = "1h";
const EXPIRED_TOKEN_TTL = "-1h";
const ONE_HOUR_MS = 60 * 60 * 1000;
const FORGOT_PASSWORD_RATE_LIMIT_MAX = 3;
const LEGACY_SCRYPT_KEY_LEN = 64;
const PASSWORD_UPGRADE_POLL_INTERVAL_MS = 25;
const PASSWORD_UPGRADE_POLL_ATTEMPTS = 40;

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForPasswordHashUpgrade = async (userId: string): Promise<string> => {
  for (let attempt = 0; attempt < PASSWORD_UPGRADE_POLL_ATTEMPTS; attempt += 1) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.passwordHash.startsWith("$argon2id$")) return user.passwordHash;
    await wait(PASSWORD_UPGRADE_POLL_INTERVAL_MS);
  }

  throw new Error(`Password hash for user ${userId} was not upgraded in time`);
};

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

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

const extractCookieValue = (response: request.Response, cookieName: string): string | undefined => {
  const rawCookies = response.headers["set-cookie"];
  const cookies = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
  const match = cookies.find((cookie) => cookie.startsWith(`${cookieName}=`));
  if (!match) return undefined;

  const valueWithAttributes = match.slice(cookieName.length + 1);
  return valueWithAttributes.split(";")[0];
};

const insertRefreshToken = async (userId: string, { expired = false } = {}) => {
  const rawToken = generateOpaqueToken();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + (expired ? -ONE_HOUR_MS : ONE_HOUR_MS)),
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

  it("returns 404 when the token's user no longer exists", async () => {
    const token = mintPurposeToken(randomUUID(), TokenPurpose.EMAIL_VERIFICATION);

    const response = await request(testApp).post("/api/auth/verify-email").send({ token });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("USER_NOT_FOUND");
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
      .set("Cookie", [`refresh_token=${generateOpaqueToken()}`]);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("INVALID_TOKEN");
  });

  it("rejects an expired refresh token and deletes it", async () => {
    const { user } = await createUser();
    const rawToken = await insertRefreshToken(user.id, { expired: true });

    const response = await request(testApp)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${rawToken}`]);

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
      .set("Cookie", [`refresh_token=${rawToken}`]);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty("accessToken");
    const rotatedToken = extractCookieValue(response, "refresh_token");
    expect(rotatedToken).toBeTruthy();
    expect(rotatedToken).not.toBe(rawToken);

    const reuse = await request(testApp)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${rawToken}`]);

    expect(reuse.status).toBe(401);
    expect(reuse.body.code).toBe("INVALID_TOKEN");
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
      .set("Cookie", [`refresh_token=${rawToken}`]);

    expect(response.status).toBe(200);

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });
    expect(stored).toBeNull();

    const refreshAfterLogout = await request(testApp)
      .post("/api/auth/refresh")
      .set("Cookie", [`refresh_token=${rawToken}`]);
    expect(refreshAfterLogout.status).toBe(401);
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

    for (let attempt = 0; attempt < FORGOT_PASSWORD_RATE_LIMIT_MAX; attempt += 1) {
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
      role: UserRole.CUSTOMER,
    });
  });
});
