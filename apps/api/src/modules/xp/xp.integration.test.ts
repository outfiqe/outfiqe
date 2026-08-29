import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";
import { ensurePlatformOrganizationExists } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const createUser = async (name: string) =>
  prisma.user.create({
    data: {
      email: `${name}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${name}-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
    },
  });

const authHeaderFor = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const createAdmin = async () => {
  const admin = await createUser("Test Admin");
  await ensurePlatformOrganizationExists();
  await crmAccessService.grantPlatformStaffMembership(admin.id);
  return { ...admin, header: authHeaderFor(admin.id, UserRole.ADMIN) };
};

const ensureFloorLevel = async () => {
  const existing = await prisma.level.findFirst({ where: { requiredXp: 0, isActive: true } });
  if (existing) return existing;
  return prisma.level.create({
    data: { level: 1, name: "Integration Test Floor", requiredXp: 0 },
  });
};

const ensureActivityConfig = async (activityType: "LOOK_CREATED") => {
  return prisma.activityXpConfig.upsert({
    where: { activityType },
    update: {},
    create: { activityType, enabled: true, xpAmount: 10 },
  });
};

describe("POST /api/xp/levels (admin)", () => {
  it("creates a level and rejects a duplicate level number", async () => {
    const admin = await createAdmin();
    const levelNumber = Math.floor(Math.random() * 100000) + 1000;

    const first = await request(testApp)
      .post("/api/xp/levels")
      .set("Authorization", admin.header)
      .send({ level: levelNumber, name: "Integration Test Level", requiredXp: 123456 });

    expect(first.status).toBe(201);

    const duplicate = await request(testApp)
      .post("/api/xp/levels")
      .set("Authorization", admin.header)
      .send({ level: levelNumber, name: "Duplicate", requiredXp: 1 });

    expect(duplicate.status).toBe(409);
  });

  it("requires the ADMIN role", async () => {
    const nonAdmin = await createUser("Non Admin");

    const response = await request(testApp)
      .post("/api/xp/levels")
      .set("Authorization", authHeaderFor(nonAdmin.id))
      .send({ level: 1, name: "x", requiredXp: 0 });

    expect(response.status).toBe(403);
  });
});

describe("PATCH /api/xp/activity-config/:activityType (admin)", () => {
  it("updates an existing config", async () => {
    const admin = await createAdmin();
    await ensureActivityConfig("LOOK_CREATED");

    const response = await request(testApp)
      .patch("/api/xp/activity-config/LOOK_CREATED")
      .set("Authorization", admin.header)
      .send({ dailyLimit: 999 });

    expect(response.status).toBe(200);
    expect(response.body.data.dailyLimit).toBe(999);
  });

  it("404s for an activity type with no config row", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .patch("/api/xp/activity-config/ADMIN_ADJUSTMENT")
      .set("Authorization", admin.header)
      .send({ xpAmount: 1 });

    expect(response.status).toBe(404);
  });
});

describe("POST /api/xp/adjust (admin)", () => {
  it("grants XP and reports the resulting level", async () => {
    await ensureFloorLevel();
    const admin = await createAdmin();
    const target = await createUser("Adjust Target");

    const response = await request(testApp)
      .post("/api/xp/adjust")
      .set("Authorization", admin.header)
      .send({ userId: target.id, amount: 50, reason: "Integration test grant" });

    expect(response.status).toBe(200);
    expect(response.body.data.awarded).toBe(true);
    expect(response.body.data.totalXp).toBe(50);
  });

  it("rejects an adjustment that would take XP below zero", async () => {
    const admin = await createAdmin();
    const target = await createUser("Negative Floor Target");

    const response = await request(testApp)
      .post("/api/xp/adjust")
      .set("Authorization", admin.header)
      .send({ userId: target.id, amount: -100, reason: "Would go negative" });

    expect(response.status).toBe(422);
  });

  it("404s for a nonexistent user", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .post("/api/xp/adjust")
      .set("Authorization", admin.header)
      .send({ userId: randomUUID(), amount: 10, reason: "x" });

    expect(response.status).toBe(404);
  });

  it("rejects a zero amount", async () => {
    const admin = await createAdmin();
    const target = await createUser("Zero Amount Target");

    const response = await request(testApp)
      .post("/api/xp/adjust")
      .set("Authorization", admin.header)
      .send({ userId: target.id, amount: 0, reason: "x" });

    expect(response.status).toBe(422);
  });

  it("requires the ADMIN role", async () => {
    const nonAdmin = await createUser("Non Admin Adjuster");
    const target = await createUser("Adjust Target 2");

    const response = await request(testApp)
      .post("/api/xp/adjust")
      .set("Authorization", authHeaderFor(nonAdmin.id))
      .send({ userId: target.id, amount: 10, reason: "x" });

    expect(response.status).toBe(403);
  });
});
