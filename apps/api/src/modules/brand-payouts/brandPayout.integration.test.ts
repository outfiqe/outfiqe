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

const OK_STATUS = 200;
const CREATED_STATUS = 201;
const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;

beforeEach(async () => {
  await redis.flushdb();
});

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

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
