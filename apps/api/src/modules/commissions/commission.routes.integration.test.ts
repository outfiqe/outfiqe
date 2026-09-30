import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CommissionScope } from "#generated/prisma/enums.js";
import { createRoleLimitedStaffSession } from "#test/integration/authHelpers.js";
import { createAdminSession, grantPlatformPermissions } from "#test/integration/authHelpers.js";
import { UNRELATED_PLATFORM_PERMISSION_KEY } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";

import { commissionRepository } from "./commission.repository.js";

const HIGH_PRICE_FLOOR = 50_000_000;
const HIGH_PRICE_SPREAD = 1_000_000_000;
const BUILD_TIER_BAND_WIDTH = 10;

const uniqueHighPrice = () => HIGH_PRICE_FLOOR + Math.floor(Math.random() * HIGH_PRICE_SPREAD);

const createCommissionsAdmin = async () => {
  const admin = await createAdminSession();
  await grantPlatformPermissions(admin.userId, "platform:commissions:manage");
  return admin;
};

const validTierBody = () => ({
  minPrice: 0,
  maxPrice: 5_000,
  amount: 100,
});

describe("POST /api/commissions/tiers", () => {
  it("creates a commission tier for a platform staffer with platform:commissions:manage", async () => {
    const { authHeader } = await createCommissionsAdmin();

    const response = await request(testApp)
      .post("/api/commissions/tiers")
      .set("Authorization", authHeader)
      .send(validTierBody());

    expect(response.status).toBe(201);
    expect(response.body.data.amount).toBe(100);
  });

  it("blocks a platform staffer without platform:commissions:manage", async () => {
    const { authHeader } = await createRoleLimitedStaffSession(UNRELATED_PLATFORM_PERMISSION_KEY);

    const response = await request(testApp)
      .post("/api/commissions/tiers")
      .set("Authorization", authHeader)
      .send(validTierBody());

    expect(response.status).toBe(403);
  });
});

describe("commission tier scope", () => {
  const createBuildTier = (minPrice: number) =>
    prisma.commissionTier.create({
      data: {
        scope: CommissionScope.OUTFIT_BUILD,
        minPrice,
        maxPrice: minPrice + BUILD_TIER_BAND_WIDTH,
        amount: 999,
      },
    });

  it("never lets a Build tier set a Creator Look commission", async () => {
    const minPrice = uniqueHighPrice();
    const buildTier = await createBuildTier(minPrice);
    const priceInsideBuildTier = minPrice + 1;

    const creatorLookTier = await commissionRepository.findTierForPrice(
      priceInsideBuildTier,
      CommissionScope.CREATOR_LOOK,
    );
    const outfitBuildTier = await commissionRepository.findTierForPrice(
      priceInsideBuildTier,
      CommissionScope.OUTFIT_BUILD,
    );

    expect(creatorLookTier?.id).not.toBe(buildTier.id);
    expect(outfitBuildTier?.id).toBe(buildTier.id);
  });

  it("keeps Build tiers out of the Creator Look tier screen and its edit and delete routes", async () => {
    const { authHeader } = await createCommissionsAdmin();
    const buildTier = await createBuildTier(uniqueHighPrice());

    const list = await request(testApp)
      .get("/api/commissions/tiers")
      .set("Authorization", authHeader);
    expect(list.status).toBe(200);
    expect(list.body.data.map((tier: { id: string }) => tier.id)).not.toContain(buildTier.id);

    const update = await request(testApp)
      .patch(`/api/commissions/tiers/${buildTier.id}`)
      .set("Authorization", authHeader)
      .send({ amount: 1 });
    expect(update.status).toBe(404);

    const remove = await request(testApp)
      .delete(`/api/commissions/tiers/${buildTier.id}`)
      .set("Authorization", authHeader);
    expect(remove.status).toBe(404);
  });

  it("creates tiers from the Creator Look screen as Creator Look tiers", async () => {
    const { authHeader } = await createCommissionsAdmin();

    const response = await request(testApp)
      .post("/api/commissions/tiers")
      .set("Authorization", authHeader)
      .send(validTierBody());

    const stored = await prisma.commissionTier.findUniqueOrThrow({
      where: { id: response.body.data.id },
    });
    expect(stored.scope).toBe(CommissionScope.CREATOR_LOOK);
  });
});

describe("commission review mutations", () => {
  it("blocks approve, void, and mark-paid for a platform staffer without platform:commissions:manage", async () => {
    const { authHeader } = await createRoleLimitedStaffSession(UNRELATED_PLATFORM_PERMISSION_KEY);
    const commissionId = randomUUID();

    const approve = await request(testApp)
      .post(`/api/commissions/${commissionId}/approve`)
      .set("Authorization", authHeader);
    expect(approve.status).toBe(403);

    const voidResponse = await request(testApp)
      .post(`/api/commissions/${commissionId}/void`)
      .set("Authorization", authHeader)
      .send({ reason: "Duplicate entry." });
    expect(voidResponse.status).toBe(403);

    const markPaid = await request(testApp)
      .post(`/api/commissions/${commissionId}/mark-paid`)
      .set("Authorization", authHeader);
    expect(markPaid.status).toBe(403);
  });

  it("lets a staffer with platform:commissions:manage reach the underlying business logic", async () => {
    const { authHeader } = await createCommissionsAdmin();
    const commissionId = randomUUID();

    const approve = await request(testApp)
      .post(`/api/commissions/${commissionId}/approve`)
      .set("Authorization", authHeader);
    expect(approve.status).toBe(409);
    expect(approve.body.code).toBe("INVALID_TRANSITION");
  });
});
