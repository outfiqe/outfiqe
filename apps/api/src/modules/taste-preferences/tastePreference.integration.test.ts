import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";
import { redis } from "#redis/redis.client.js";
import { ensurePlatformOrganizationExists } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

beforeEach(async () => {
  await redis.flushdb();
});

const createUser = async (role: UserRole = UserRole.CUSTOMER) =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name: "Taste Tester",
      handle: `taste-tester-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });

const authHeaderFor = (userId: string, role: UserRole) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const adminAuthHeader = async () => {
  const admin = await createUser(UserRole.ADMIN);
  await ensurePlatformOrganizationExists();
  await crmAccessService.grantPlatformStaffMembership(admin.id);
  return authHeaderFor(admin.id, UserRole.ADMIN);
};

describe("/api/taste-preferences/me", () => {
  it("returns null for a user who has never set one", async () => {
    const user = await createUser();

    const response = await request(testApp)
      .get("/api/taste-preferences/me")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ categorySlugs: null });
  });

  it("requires authentication", async () => {
    const response = await request(testApp).get("/api/taste-preferences/me");
    expect(response.status).toBe(401);
  });

  it("stores, de-duplicates and reads back an ordered selection", async () => {
    const user = await createUser();
    const authHeader = authHeaderFor(user.id, UserRole.CUSTOMER);

    const put = await request(testApp)
      .put("/api/taste-preferences/me")
      .set("Authorization", authHeader)
      .send({ categorySlugs: ["old-money", "streetwear", "old-money"] });

    expect(put.status).toBe(200);
    expect(put.body.data).toEqual({ categorySlugs: ["old-money", "streetwear"] });

    const get = await request(testApp)
      .get("/api/taste-preferences/me")
      .set("Authorization", authHeader);
    expect(get.body.data.categorySlugs).toEqual(["old-money", "streetwear"]);
  });

  it("treats an empty array the same as no preference", async () => {
    const user = await createUser();
    const authHeader = authHeaderFor(user.id, UserRole.CUSTOMER);

    await request(testApp)
      .put("/api/taste-preferences/me")
      .set("Authorization", authHeader)
      .send({ categorySlugs: ["y2k"] });

    const cleared = await request(testApp)
      .put("/api/taste-preferences/me")
      .set("Authorization", authHeader)
      .send({ categorySlugs: [] });

    expect(cleared.body.data).toEqual({ categorySlugs: null });
    expect(await prisma.tastePreference.findUnique({ where: { userId: user.id } })).toBeNull();
  });

  it("clears the preference on DELETE", async () => {
    const user = await createUser();
    const authHeader = authHeaderFor(user.id, UserRole.CUSTOMER);

    await request(testApp)
      .put("/api/taste-preferences/me")
      .set("Authorization", authHeader)
      .send({ categorySlugs: ["formal"] });

    const response = await request(testApp)
      .delete("/api/taste-preferences/me")
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(await prisma.tastePreference.findUnique({ where: { userId: user.id } })).toBeNull();
  });
});

describe("GET /api/taste-preferences/popularity", () => {
  it("counts how many users have each category, most-picked first", async () => {
    const authHeader = await adminAuthHeader();
    const one = await createUser();
    const two = await createUser();
    await prisma.tastePreference.create({
      data: { userId: one.id, categorySlugs: ["pop-a", "pop-b"] },
    });
    await prisma.tastePreference.create({
      data: { userId: two.id, categorySlugs: ["pop-a"] },
    });

    const response = await request(testApp)
      .get("/api/taste-preferences/popularity")
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    const counts = new Map(
      response.body.data.map((row: { slug: string; userCount: number }) => [
        row.slug,
        row.userCount,
      ]),
    );
    expect(counts.get("pop-a")).toBe(2);
    expect(counts.get("pop-b")).toBe(1);
  });

  it("rejects a non-admin caller", async () => {
    const customer = await createUser(UserRole.CUSTOMER);
    const response = await request(testApp)
      .get("/api/taste-preferences/popularity")
      .set("Authorization", authHeaderFor(customer.id, UserRole.CUSTOMER));

    expect(response.status).toBe(403);
  });
});
