import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { generateToken } from "#lib/generate-token.utils.js";
import { hashPassword } from "#lib/password.utils.js";
import { testApp } from "#test/integration/testApp.js";

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const createUserWithAccessToken = async (overrides: { phone?: string | null } = {}) => {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: {
      email: `user-${suffix}@outfiqe.test`,
      name: "Test User",
      handle: `test-user-${suffix}`,
      phone: overrides.phone === undefined ? uniquePhone() : overrides.phone,
      passwordHash: await hashPassword("correct-horse-battery"),
      emailVerified: true,
    },
  });
  const accessToken = generateToken({ sub: user.id, role: user.role });
  return { user, accessToken };
};

describe("PATCH /api/users/me", () => {
  it("requires authentication", async () => {
    const response = await request(testApp).patch("/api/users/me").send({ name: "New Name" });

    expect(response.status).toBe(401);
  });

  it("adds a phone number to an account that doesn't have one yet", async () => {
    const { user, accessToken } = await createUserWithAccessToken({ phone: null });
    const newPhone = uniquePhone();

    const response = await request(testApp)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ phone: newPhone });

    expect(response.status).toBe(200);
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.phone).toBe(newPhone);
  });

  it("rejects a phone number already used by another account", async () => {
    const existingOwner = await createUserWithAccessToken();
    const { accessToken } = await createUserWithAccessToken({ phone: null });

    const response = await request(testApp)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ phone: existingOwner.user.phone });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("PHONE_EXISTS");
  });

  it("rejects a malformed phone number", async () => {
    const { accessToken } = await createUserWithAccessToken({ phone: null });

    const response = await request(testApp)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ phone: "not-a-phone-number" });

    expect(response.status).toBe(422);
  });

  it("updates the name without requiring a phone number", async () => {
    const { user, accessToken } = await createUserWithAccessToken();

    const response = await request(testApp)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Updated Name" });

    expect(response.status).toBe(200);
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.name).toBe("Updated Name");
    expect(stored.phone).toBe(user.phone);
  });
});
