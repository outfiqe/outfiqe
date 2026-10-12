import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { TokenPurpose } from "#constants/enums/auth.enum.js";
import { prisma } from "#db/prisma.js";
import { generateToken } from "#lib/generate-token.utils.js";
import { hashToken } from "#lib/opaque-token.utils.js";
import {
  createUser,
  DEFAULT_TEST_PASSWORD,
  EXPIRED_TOKEN_TTL,
  extractCookieValue,
  insertRefreshToken,
  mintPurposeToken,
} from "#test/integration/auth-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import {
  FORGOT_PASSWORD_MAX_REQUESTS,
  RESET_PASSWORD_IP_RATE_LIMIT_MAX_REQUESTS,
} from "../auth.constants.js";

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

describe("POST /api/auth/change-password", () => {
  const loginSession = async (email: string, password: string) => {
    const login = await request(testApp).post("/api/auth/login").send({ email, password });
    return {
      accessToken: login.body.data.accessToken as string,
      refreshToken: extractCookieValue(login, "refresh_token") ?? "",
    };
  };

  const changePassword = (
    accessToken: string,
    refreshToken: string,
    body: Record<string, string>,
  ) =>
    request(testApp)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Cookie", `refresh_token=${refreshToken}`)
      .send(body);

  it("requires authentication", async () => {
    const response = await request(testApp).post("/api/auth/change-password").send({
      currentPassword: DEFAULT_TEST_PASSWORD,
      newPassword: "brand-new-password",
      confirmNewPassword: "brand-new-password",
    });

    expect(response.status).toBe(401);
  });

  it("changes the password, keeps the current session, and revokes the others", async () => {
    const { user, password } = await createUser();
    const { accessToken, refreshToken } = await loginSession(user.email, password);
    await insertRefreshToken(user.id);
    const newPassword = "a-fresh-secret-1";

    const response = await changePassword(accessToken, refreshToken, {
      currentPassword: password,
      newPassword,
      confirmNewPassword: newPassword,
    });

    expect(response.status).toBe(200);

    const remainingTokens = await prisma.refreshToken.findMany({ where: { userId: user.id } });
    expect(remainingTokens).toHaveLength(1);
    expect(remainingTokens[0]?.tokenHash).toBe(hashToken(refreshToken));

    const oldLogin = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password: newPassword });
    expect(newLogin.status).toBe(200);
  });

  it("rejects an incorrect current password without changing anything", async () => {
    const { user, password } = await createUser();
    const { accessToken, refreshToken } = await loginSession(user.email, password);

    const response = await changePassword(accessToken, refreshToken, {
      currentPassword: "not-my-password",
      newPassword: "a-fresh-secret-1",
      confirmNewPassword: "a-fresh-secret-1",
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("INVALID_CURRENT_PASSWORD");

    const stillWorks = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password });
    expect(stillWorks.status).toBe(200);
  });

  it("rejects reusing the current password", async () => {
    const { user, password } = await createUser();
    const { accessToken, refreshToken } = await loginSession(user.email, password);

    const response = await changePassword(accessToken, refreshToken, {
      currentPassword: password,
      newPassword: password,
      confirmNewPassword: password,
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("PASSWORD_UNCHANGED");
  });

  it("rejects a mismatched confirmation", async () => {
    const { user, password } = await createUser();
    const { accessToken, refreshToken } = await loginSession(user.email, password);

    const response = await changePassword(accessToken, refreshToken, {
      currentPassword: password,
      newPassword: "a-fresh-secret-1",
      confirmNewPassword: "a-different-secret-2",
    });

    expect(response.status).toBe(422);
  });

  it("rejects an account that signs in only through a connected account", async () => {
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
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currentPassword: "anything",
        newPassword: "a-fresh-secret-1",
        confirmNewPassword: "a-fresh-secret-1",
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("NO_PASSWORD_SET");
  });
});
