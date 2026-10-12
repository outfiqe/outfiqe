import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { TokenPurpose } from "#constants/enums/auth.enum.js";
import { prisma } from "#db/prisma.js";
import {
  createUser,
  EXPIRED_TOKEN_TTL,
  mintPurposeToken,
  registerBody,
} from "#test/integration/auth-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import { REGISTER_IP_RATE_LIMIT_MAX_REQUESTS } from "../auth.constants.js";

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
