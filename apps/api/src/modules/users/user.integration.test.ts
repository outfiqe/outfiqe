import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateToken } from "#lib/generate-token.utils.js";
import { hashPassword } from "#lib/password.utils.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";
import { ensurePlatformOrganizationExists } from "#test/integration/crmFixtures.js";
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

describe("GET /api/users/search (admin)", () => {
  const createAdminToken = async () => {
    const { user } = await createUserWithAccessToken();
    await prisma.user.update({ where: { id: user.id }, data: { role: UserRole.ADMIN } });
    await ensurePlatformOrganizationExists();
    await crmAccessService.grantPlatformStaffMembership(user.id);
    return generateToken({ sub: user.id, role: UserRole.ADMIN });
  };

  it("finds users by a fragment of their name or handle", async () => {
    const adminToken = await createAdminToken();
    const marker = randomUUID().slice(0, 6);
    await prisma.user.create({
      data: {
        email: `${marker}@outfiqe.test`,
        name: `Ada ${marker} Lovelace`,
        handle: `ada-${marker}`,
        phone: uniquePhone(),
        passwordHash: "x",
      },
    });

    const byName = await request(testApp)
      .get(`/api/users/search?q=${marker}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(byName.status).toBe(200);
    expect(byName.body.data).toHaveLength(1);
    expect(byName.body.data[0]).toMatchObject({ handle: `ada-${marker}` });
    expect(byName.body.data[0]).not.toHaveProperty("email");

    const byHandle = await request(testApp)
      .get(`/api/users/search?q=ADA-${marker}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(byHandle.body.data).toHaveLength(1);
  });

  it("rejects an empty query", async () => {
    const adminToken = await createAdminToken();

    const response = await request(testApp)
      .get("/api/users/search?q=")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(422);
  });

  it("requires an admin", async () => {
    const { accessToken } = await createUserWithAccessToken();

    const response = await request(testApp)
      .get("/api/users/search?q=test")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
  });
});
