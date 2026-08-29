import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";
import { ensurePlatformOrganizationExists } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";

import { xpService } from "./xp.service.js";

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;
const HOUR_MS = 60 * 60 * 1000;

const createUser = async () =>
  prisma.user.create({
    data: {
      email: `xp-multiplier-${randomUUID()}@outfiqe.test`,
      name: "XP Multiplier Tester",
      handle: `xp-multiplier-${randomUUID().slice(0, 8)}`,
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
  const admin = await createUser();
  await ensurePlatformOrganizationExists();
  await crmAccessService.grantPlatformStaffMembership(admin.id);
  return { ...admin, header: authHeaderFor(admin.id, UserRole.ADMIN) };
};

const ensureFloorLevel = async () => {
  const existing = await prisma.level.findFirst({ where: { requiredXp: 0, isActive: true } });
  if (existing) return existing;
  return prisma.level.create({
    data: { level: 1, name: "Multiplier Test Floor", requiredXp: 0 },
  });
};

const ensureActivityConfig = async (xpAmount: number) => {
  await ensureFloorLevel();
  return prisma.activityXpConfig.upsert({
    where: { activityType: "LOOK_CREATED" },
    update: {
      enabled: true,
      xpAmount,
      dailyLimit: null,
      cooldownSeconds: null,
      maxPerEntity: null,
    },
    create: { activityType: "LOOK_CREATED", enabled: true, xpAmount },
  });
};

const createMultiplierWindow = async (multiplier: number, offsetMs = 0) =>
  prisma.xpMultiplier.create({
    data: {
      label: `Test multiplier ${randomUUID()}`,
      multiplier,
      startsAt: new Date(Date.now() - HOUR_MS + offsetMs),
      endsAt: new Date(Date.now() + HOUR_MS + offsetMs),
      isActive: true,
    },
  });

const latestTransactionFor = (userId: string) =>
  prisma.xpTransaction.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });

describe("xpService.awardXp with an active multiplier", () => {
  it("multiplies the awarded XP by the active window's multiplier", async () => {
    await ensureActivityConfig(10);
    await createMultiplierWindow(2);
    const user = await createUser();

    const result = await xpService.awardXp({
      userId: user.id,
      activityType: "LOOK_CREATED",
      source: "creator-looks",
    });

    expect(result).toMatchObject({ awarded: true, amount: 20 });
    const transaction = await latestTransactionFor(user.id);
    expect(transaction?.amount).toBe(20);
    expect(transaction?.metadata).toMatchObject({ multiplier: 2, baseAmount: 10 });
  });

  it("awards the plain configured amount when no multiplier window is active", async () => {
    await ensureActivityConfig(10);
    const user = await createUser();

    const result = await xpService.awardXp({
      userId: user.id,
      activityType: "LOOK_CREATED",
      source: "creator-looks",
    });

    expect(result).toMatchObject({ awarded: true, amount: 10 });
    const transaction = await latestTransactionFor(user.id);
    expect(transaction?.metadata).toBeNull();
  });

  it("uses the highest multiplier when two windows overlap", async () => {
    await ensureActivityConfig(10);
    await createMultiplierWindow(2);
    await createMultiplierWindow(3);
    const user = await createUser();

    const result = await xpService.awardXp({
      userId: user.id,
      activityType: "LOOK_CREATED",
      source: "creator-looks",
    });

    expect(result).toMatchObject({ awarded: true, amount: 30 });
  });

  it("ignores a multiplier window that hasn't started yet or has already ended", async () => {
    await ensureActivityConfig(10);
    await createMultiplierWindow(5, 2 * HOUR_MS);
    const user = await createUser();

    const result = await xpService.awardXp({
      userId: user.id,
      activityType: "LOOK_CREATED",
      source: "creator-looks",
    });

    expect(result).toMatchObject({ awarded: true, amount: 10 });
  });

  it("ignores a deactivated multiplier window even while inside its date range", async () => {
    await ensureActivityConfig(10);
    const inactiveWindow = await createMultiplierWindow(4);
    await prisma.xpMultiplier.update({
      where: { id: inactiveWindow.id },
      data: { isActive: false },
    });
    const user = await createUser();

    const result = await xpService.awardXp({
      userId: user.id,
      activityType: "LOOK_CREATED",
      source: "creator-looks",
    });

    expect(result).toMatchObject({ awarded: true, amount: 10 });
  });
});

describe("xpService.grantFixedXp with an active multiplier", () => {
  it("is not affected by an active XP multiplier window", async () => {
    await ensureFloorLevel();
    await createMultiplierWindow(2);
    const user = await createUser();

    const result = await xpService.grantFixedXp(
      { userId: user.id, activityType: "ACHIEVEMENT_UNLOCKED", source: "achievements" },
      25,
    );

    expect(result).toMatchObject({ awarded: true, amount: 25 });
  });
});

describe("XP multiplier admin API", () => {
  it("creates, lists, and updates a multiplier window", async () => {
    const admin = await createAdmin();
    const startsAt = new Date(Date.now() - HOUR_MS).toISOString();
    const endsAt = new Date(Date.now() + HOUR_MS).toISOString();

    const createResponse = await request(testApp)
      .post("/api/xp/multipliers")
      .set("Authorization", admin.header)
      .send({ label: "Founders Weekend", multiplier: 2, startsAt, endsAt });

    expect(createResponse.status).toBe(201);
    const multiplierId = createResponse.body.data.id;

    const listResponse = await request(testApp)
      .get("/api/xp/multipliers")
      .set("Authorization", admin.header);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.some((row: { id: string }) => row.id === multiplierId)).toBe(
      true,
    );

    const updateResponse = await request(testApp)
      .patch(`/api/xp/multipliers/${multiplierId}`)
      .set("Authorization", admin.header)
      .send({ isActive: false });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.isActive).toBe(false);
  });

  it("rejects a window that ends before it starts", async () => {
    const admin = await createAdmin();
    const startsAt = new Date(Date.now() + HOUR_MS).toISOString();
    const endsAt = new Date(Date.now() - HOUR_MS).toISOString();

    const response = await request(testApp)
      .post("/api/xp/multipliers")
      .set("Authorization", admin.header)
      .send({ label: "Bad Window", multiplier: 2, startsAt, endsAt });

    expect(response.status).toBe(422);
  });

  it("404s when updating a multiplier that doesn't exist", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .patch(`/api/xp/multipliers/${randomUUID()}`)
      .set("Authorization", admin.header)
      .send({ isActive: false });

    expect(response.status).toBe(404);
  });
});

describe("GET /api/xp/multiplier/active", () => {
  it("returns the active multiplier for any authenticated user", async () => {
    await createMultiplierWindow(2);
    const user = await createUser();

    const response = await request(testApp)
      .get("/api/xp/multiplier/active")
      .set("Authorization", authHeaderFor(user.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ multiplier: 2 });
  });

  it("returns null when no multiplier is active", async () => {
    const user = await createUser();

    const response = await request(testApp)
      .get("/api/xp/multiplier/active")
      .set("Authorization", authHeaderFor(user.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toBeNull();
  });
});
