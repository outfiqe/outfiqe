import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  BrandPayoutStatus,
  BrandRole,
  PaymentMethod,
  PlatformFeeType,
  ProductStatus,
  ProductType,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const OK_STATUS = 200;
const CREATED_STATUS = 201;
const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;

beforeEach(async () => {
  await redis.flushdb();
});

const authHeaderFor = (userId: string, role: UserRole) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const createUser = async (role: UserRole = UserRole.BRAND_OWNER) => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `brand-payout-tester-${suffix}@outfiqe.test`,
      name: "Brand Payout Tester",
      handle: `brand-payout-tester-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });
};

const createBrandWithMember = async () => {
  const brand = await prisma.brand.create({
    data: {
      name: `Payout Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const member = await createUser();
  await prisma.brandMembership.create({
    data: { userId: member.id, brandId: brand.id, role: BrandRole.OWNER },
  });
  return { brand, member };
};

const createBrandPayout = async (
  brandId: string,
  status: BrandPayoutStatus,
  netAmount: number,
  ruleId: string,
) => {
  const product = await prisma.product.create({
    data: {
      brandId,
      name: "Ledger Item",
      price: netAmount,
      type: ProductType.TOPS,
      status: ProductStatus.APPROVED,
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: 5 },
  });
  const buyer = await createUser(UserRole.CUSTOMER);
  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      fullName: "Buyer",
      phone: uniquePhone(),
      address: "Somewhere",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
      subtotal: netAmount,
      deliveryFee: 0,
      total: netAmount,
      items: { create: [{ productId: product.id, sizeId: size.id, qty: 1, unitPrice: netAmount }] },
    },
    include: { items: true },
  });
  const orderItemId = order.items[0]?.id;
  if (!orderItemId) throw new Error("order item not created");

  return prisma.brandPayout.create({
    data: {
      orderItemId,
      brandId,
      commissionRuleId: ruleId,
      grossAmount: netAmount,
      platformFee: 0,
      gatewayFee: 0,
      netAmount,
      status,
    },
  });
};

const SINGLE_FLAT_TIER = [{ minPrice: 0, maxPrice: null, feeType: "FLAT", flatAmount: 30 }];

const TWO_TIER_LADDER = [
  { minPrice: 0, maxPrice: 1_000, feeType: "FLAT", flatAmount: 30 },
  { minPrice: 1_000, maxPrice: null, feeType: "PERCENT", ratePercent: 5 },
];

describe("platform commission rules (admin)", () => {
  it("requires admin", async () => {
    const user = await createUser();

    const response = await request(testApp)
      .post("/api/brand-payouts/commission-rules")
      .set("Authorization", authHeaderFor(user.id, UserRole.BRAND_OWNER))
      .send({ tiers: SINGLE_FLAT_TIER });

    expect(response.status).toBe(FORBIDDEN_STATUS);
  });

  it("creates a new active rule and deactivates the previous one", async () => {
    const { userId: adminId, authHeader } = await createAdminSession();
    const first = await request(testApp)
      .post("/api/brand-payouts/commission-rules")
      .set("Authorization", authHeader)
      .send({ tiers: SINGLE_FLAT_TIER });
    expect(first.status).toBe(CREATED_STATUS);
    expect(first.body.data.tiers).toHaveLength(1);
    expect(first.body.data.tiers[0]).toMatchObject({ feeType: "FLAT", flatAmount: 30 });

    const second = await request(testApp)
      .post("/api/brand-payouts/commission-rules")
      .set("Authorization", authHeader)
      .send({ tiers: TWO_TIER_LADDER });
    expect(second.status).toBe(CREATED_STATUS);
    expect(second.body.data.tiers).toHaveLength(2);
    expect(second.body.data.isActive).toBe(true);

    const rules = await prisma.platformCommissionRule.findMany({
      where: { updatedById: adminId },
      orderBy: { createdAt: "asc" },
    });
    expect(rules[0]?.isActive).toBe(false);
    expect(rules[1]?.isActive).toBe(true);

    const listResponse = await request(testApp)
      .get("/api/brand-payouts/commission-rules")
      .set("Authorization", authHeader);
    expect(listResponse.status).toBe(OK_STATUS);
    expect(listResponse.body.data).toHaveLength(2);
  });

  it("rejects a tier ladder with a gap", async () => {
    const { authHeader } = await createAdminSession();

    const response = await request(testApp)
      .post("/api/brand-payouts/commission-rules")
      .set("Authorization", authHeader)
      .send({
        tiers: [
          { minPrice: 0, maxPrice: 1_000, feeType: "FLAT", flatAmount: 30 },
          { minPrice: 1_500, maxPrice: null, feeType: "PERCENT", ratePercent: 5 },
        ],
      });

    expect(response.status).toBe(422);
  });

  it("rejects a tier ladder that doesn't start at 0", async () => {
    const { authHeader } = await createAdminSession();

    const response = await request(testApp)
      .post("/api/brand-payouts/commission-rules")
      .set("Authorization", authHeader)
      .send({ tiers: [{ minPrice: 100, maxPrice: null, feeType: "FLAT", flatAmount: 30 }] });

    expect(response.status).toBe(422);
  });

  it("rejects a tier ladder whose highest tier is capped", async () => {
    const { authHeader } = await createAdminSession();

    const response = await request(testApp)
      .post("/api/brand-payouts/commission-rules")
      .set("Authorization", authHeader)
      .send({ tiers: [{ minPrice: 0, maxPrice: 1_000, feeType: "FLAT", flatAmount: 30 }] });

    expect(response.status).toBe(422);
  });
});

describe("gateway fee rates (admin)", () => {
  it("requires admin", async () => {
    const user = await createUser();

    const response = await request(testApp)
      .post("/api/brand-payouts/gateway-fee-rates")
      .set("Authorization", authHeaderFor(user.id, UserRole.BRAND_OWNER))
      .send({ paymentMethod: PaymentMethod.ESEWA, ratePercent: 2 });

    expect(response.status).toBe(FORBIDDEN_STATUS);
  });

  it("creates a new active rate and deactivates only the previous rate for that provider", async () => {
    const { userId: adminId, authHeader } = await createAdminSession();

    const firstEsewa = await request(testApp)
      .post("/api/brand-payouts/gateway-fee-rates")
      .set("Authorization", authHeader)
      .send({ paymentMethod: PaymentMethod.ESEWA, ratePercent: 2 });
    expect(firstEsewa.status).toBe(CREATED_STATUS);

    const khalti = await request(testApp)
      .post("/api/brand-payouts/gateway-fee-rates")
      .set("Authorization", authHeader)
      .send({ paymentMethod: PaymentMethod.KHALTI, ratePercent: 2.5 });
    expect(khalti.status).toBe(CREATED_STATUS);

    const secondEsewa = await request(testApp)
      .post("/api/brand-payouts/gateway-fee-rates")
      .set("Authorization", authHeader)
      .send({ paymentMethod: PaymentMethod.ESEWA, ratePercent: 3 });
    expect(secondEsewa.status).toBe(CREATED_STATUS);
    expect(secondEsewa.body.data.isActive).toBe(true);

    const rates = await prisma.gatewayFeeRate.findMany({
      where: { updatedById: adminId },
      orderBy: [{ paymentMethod: "asc" }, { createdAt: "asc" }],
    });
    const esewaRates = rates.filter((rate) => rate.paymentMethod === PaymentMethod.ESEWA);
    expect(esewaRates[0]?.isActive).toBe(false);
    expect(esewaRates[1]?.isActive).toBe(true);
    const khaltiRate = rates.find((rate) => rate.paymentMethod === PaymentMethod.KHALTI);
    expect(khaltiRate?.isActive).toBe(true);

    const listResponse = await request(testApp)
      .get("/api/brand-payouts/gateway-fee-rates")
      .set("Authorization", authHeader);
    expect(listResponse.status).toBe(OK_STATUS);
    expect(listResponse.body.data).toHaveLength(3);
  });
});

describe("brand commission exemptions (admin)", () => {
  it("requires admin", async () => {
    const user = await createUser();
    const { brand } = await createBrandWithMember();

    const response = await request(testApp)
      .post("/api/brand-payouts/exemptions")
      .set("Authorization", authHeaderFor(user.id, UserRole.BRAND_OWNER))
      .send({
        brandId: brand.id,
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        reason: "Launch cohort",
      });

    expect(response.status).toBe(FORBIDDEN_STATUS);
  });

  it("creates, lists, and revokes an exemption", async () => {
    const { authHeader } = await createAdminSession();
    const { brand } = await createBrandWithMember();

    const createResponse = await request(testApp)
      .post("/api/brand-payouts/exemptions")
      .set("Authorization", authHeader)
      .send({
        brandId: brand.id,
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        reason: "Launch cohort, first 10 brands",
      });
    expect(createResponse.status).toBe(CREATED_STATUS);
    expect(createResponse.body.data.brandName).toBe(brand.name);
    expect(createResponse.body.data.revokedAt).toBeNull();
    const exemptionId = createResponse.body.data.id;

    const listResponse = await request(testApp)
      .get(`/api/brand-payouts/exemptions?brandId=${brand.id}`)
      .set("Authorization", authHeader);
    expect(listResponse.status).toBe(OK_STATUS);
    expect(listResponse.body.data).toHaveLength(1);

    const revokeResponse = await request(testApp)
      .patch(`/api/brand-payouts/exemptions/${exemptionId}/revoke`)
      .set("Authorization", authHeader);
    expect(revokeResponse.status).toBe(OK_STATUS);

    const revoked = await prisma.brandCommissionExemption.findUniqueOrThrow({
      where: { id: exemptionId },
    });
    expect(revoked.revokedAt).not.toBeNull();

    const secondRevoke = await request(testApp)
      .patch(`/api/brand-payouts/exemptions/${exemptionId}/revoke`)
      .set("Authorization", authHeader);
    expect(secondRevoke.status).toBe(NOT_FOUND_STATUS);
  });

  it("does not alter an already-created brand payout when its brand's exemption is revoked", async () => {
    const { userId: adminId, authHeader } = await createAdminSession();
    const { brand } = await createBrandWithMember();
    const rule = await prisma.platformCommissionRule.create({
      data: { isActive: true, updatedById: adminId },
    });
    const exemption = await prisma.brandCommissionExemption.create({
      data: {
        brandId: brand.id,
        startsAt: new Date(Date.now() - 1000),
        endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        reason: "Launch cohort",
        createdById: adminId,
      },
    });
    const payout = await createBrandPayout(brand.id, BrandPayoutStatus.PENDING, 1000, rule.id);
    await prisma.brandPayout.update({ where: { id: payout.id }, data: { platformFee: 0 } });

    const revokeResponse = await request(testApp)
      .patch(`/api/brand-payouts/exemptions/${exemption.id}/revoke`)
      .set("Authorization", authHeader);
    expect(revokeResponse.status).toBe(OK_STATUS);

    const unchangedPayout = await prisma.brandPayout.findUniqueOrThrow({
      where: { id: payout.id },
    });
    expect(unchangedPayout.platformFee).toBe(0);
    expect(unchangedPayout.netAmount).toBe(1000);
  });
});

describe("GET /api/brand-payouts/me/summary", () => {
  it("sums netAmount by status, excluding voided rows", async () => {
    const { brand, member } = await createBrandWithMember();
    const { userId: adminId } = await createAdminSession();
    const rule = await prisma.platformCommissionRule.create({
      data: {
        isActive: true,
        updatedById: adminId,
        tiers: {
          create: [
            {
              minPrice: 0,
              maxPrice: null,
              feeType: PlatformFeeType.PERCENT,
              ratePercentBasisPoints: 1200,
              sortOrder: 0,
            },
          ],
        },
      },
    });

    await createBrandPayout(brand.id, BrandPayoutStatus.PENDING, 500, rule.id);
    await createBrandPayout(brand.id, BrandPayoutStatus.AVAILABLE, 800, rule.id);
    await createBrandPayout(brand.id, BrandPayoutStatus.WITHDRAWN, 300, rule.id);
    await createBrandPayout(brand.id, BrandPayoutStatus.VOIDED, 999, rule.id);

    const response = await request(testApp)
      .get("/api/brand-payouts/me/summary")
      .set("Authorization", authHeaderFor(member.id, UserRole.BRAND_OWNER));

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data).toEqual({
      totalPayouts: 1600,
      pending: 500,
      available: 800,
      withdrawn: 300,
    });
  });

  it("404s for a user with no brand membership", async () => {
    const outsider = await createUser();

    const response = await request(testApp)
      .get("/api/brand-payouts/me/summary")
      .set("Authorization", authHeaderFor(outsider.id, UserRole.BRAND_OWNER));

    expect(response.status).toBe(NOT_FOUND_STATUS);
  });
});

describe("GET /api/brand-payouts/me", () => {
  it("lists the brand's own payout ledger, newest first, with product details", async () => {
    const { brand, member } = await createBrandWithMember();
    const { userId: adminId } = await createAdminSession();
    const rule = await prisma.platformCommissionRule.create({
      data: { isActive: true, updatedById: adminId },
    });

    const first = await createBrandPayout(brand.id, BrandPayoutStatus.PENDING, 500, rule.id);
    const second = await createBrandPayout(brand.id, BrandPayoutStatus.AVAILABLE, 800, rule.id);

    const response = await request(testApp)
      .get("/api/brand-payouts/me")
      .set("Authorization", authHeaderFor(member.id, UserRole.BRAND_OWNER));

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.items).toHaveLength(2);
    expect(response.body.data.items[0].id).toBe(second.id);
    expect(response.body.data.items[0].productName).toBe("Ledger Item");
    expect(response.body.data.items[1].id).toBe(first.id);
  });

  it("pages through the brand's payout ledger with a cursor", async () => {
    const { brand, member } = await createBrandWithMember();
    const { userId: adminId } = await createAdminSession();
    const rule = await prisma.platformCommissionRule.create({
      data: { isActive: true, updatedById: adminId },
    });
    await createBrandPayout(brand.id, BrandPayoutStatus.PENDING, 500, rule.id);
    await createBrandPayout(brand.id, BrandPayoutStatus.AVAILABLE, 800, rule.id);
    const authHeader = authHeaderFor(member.id, UserRole.BRAND_OWNER);

    const firstPage = await request(testApp)
      .get("/api/brand-payouts/me")
      .query({ limit: 1 })
      .set("Authorization", authHeader);

    expect(firstPage.status).toBe(OK_STATUS);
    expect(firstPage.body.data.items).toHaveLength(1);
    expect(firstPage.body.data.nextCursor).not.toBeNull();

    const secondPage = await request(testApp)
      .get("/api/brand-payouts/me")
      .query({ limit: 1, cursor: firstPage.body.data.nextCursor })
      .set("Authorization", authHeader);

    expect(secondPage.status).toBe(OK_STATUS);
    expect(secondPage.body.data.items).toHaveLength(1);
    expect(secondPage.body.data.items[0].id).not.toBe(firstPage.body.data.items[0].id);
  });

  it("404s for a user with no brand membership", async () => {
    const outsider = await createUser();

    const response = await request(testApp)
      .get("/api/brand-payouts/me")
      .set("Authorization", authHeaderFor(outsider.id, UserRole.BRAND_OWNER));

    expect(response.status).toBe(NOT_FOUND_STATUS);
  });
});
