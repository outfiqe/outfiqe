import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  BrandPayoutStatus,
  CommissionSource,
  CommissionStatus,
  PaymentMethod,
  PaymentTransactionStatus,
  PaymentTransactionType,
  ProductStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const OK_STATUS = 200;
const FORBIDDEN_STATUS = 403;

beforeEach(async () => {
  await redis.flushdb();
});

const authHeaderFor = (userId: string, role: UserRole) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const createUser = async (role: UserRole = UserRole.CUSTOMER) => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `rollup-tester-${suffix}@outfiqe.test`,
      name: "Rollup Tester",
      handle: `rollup-tester-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });
};

const createOrderWithTransaction = async (
  total: number,
  type: PaymentTransactionType,
  createdAt: Date,
) => {
  const buyer = await createUser();
  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      fullName: "Buyer",
      phone: uniquePhone(),
      address: "Somewhere",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.KHALTI,
      subtotal: total,
      deliveryFee: 0,
      total,
    },
  });
  await prisma.paymentTransaction.create({
    data: {
      orderId: order.id,
      provider: PaymentMethod.KHALTI,
      type,
      status: PaymentTransactionStatus.SUCCEEDED,
      createdAt,
    },
  });
  return order;
};

const grantCommission = async (status: CommissionStatus, amount: number, createdAt: Date) => {
  const creator = await createUser();
  const tier = await prisma.commissionTier.create({
    data: { minPrice: 0, maxPrice: null, amount, sortOrder: 0 },
  });
  const buyer = await createUser();
  const brand = await prisma.brand.create({
    data: {
      name: `Rollup Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Item",
      price: amount,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: 5 },
  });
  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      fullName: "Buyer",
      phone: uniquePhone(),
      address: "Somewhere",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
      subtotal: amount,
      deliveryFee: 0,
      total: amount,
      items: { create: [{ productId: product.id, sizeId: size.id, qty: 1, unitPrice: amount }] },
    },
    include: { items: true },
  });
  const orderItemId = order.items[0]?.id;
  if (!orderItemId) throw new Error("order item not created");

  await prisma.creatorCommission.create({
    data: {
      creatorId: creator.id,
      orderItemId,
      source: CommissionSource.TAG_CLICK,
      tierId: tier.id,
      amount,
      status,
      createdAt,
    },
  });
};

const grantBrandPayout = async (
  status: BrandPayoutStatus,
  netAmount: number,
  platformFee: number,
  createdAt: Date,
) => {
  const admin = await createUser(UserRole.ADMIN);
  const rule = await prisma.platformCommissionRule.create({
    data: { isActive: false, updatedById: admin.id },
  });
  const brand = await prisma.brand.create({
    data: {
      name: `Rollup Payout Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const buyer = await createUser();
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Item",
      price: netAmount + platformFee,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: 5 },
  });
  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      fullName: "Buyer",
      phone: uniquePhone(),
      address: "Somewhere",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
      subtotal: netAmount + platformFee,
      deliveryFee: 0,
      total: netAmount + platformFee,
      items: {
        create: [
          { productId: product.id, sizeId: size.id, qty: 1, unitPrice: netAmount + platformFee },
        ],
      },
    },
    include: { items: true },
  });
  const orderItemId = order.items[0]?.id;
  if (!orderItemId) throw new Error("order item not created");

  await prisma.brandPayout.create({
    data: {
      orderItemId,
      brandId: brand.id,
      commissionRuleId: rule.id,
      grossAmount: netAmount + platformFee,
      platformFee,
      gatewayFee: 0,
      netAmount,
      status,
      createdAt,
    },
  });
};

describe("GET /api/admin/financial-rollup", () => {
  it("requires admin", async () => {
    const user = await createUser();
    const response = await request(testApp)
      .get("/api/admin/financial-rollup")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER));

    expect(response.status).toBe(FORBIDDEN_STATUS);
  });

  it("computes gateway gross/refunded/net and ledger sums for range=all", async () => {
    const { authHeader } = await createAdminSession();
    const now = new Date();

    await createOrderWithTransaction(1000, PaymentTransactionType.PAYMENT, now);
    await createOrderWithTransaction(500, PaymentTransactionType.PAYMENT, now);
    await createOrderWithTransaction(300, PaymentTransactionType.REFUND, now);

    await grantCommission(CommissionStatus.AVAILABLE, 200, now);
    await grantCommission(CommissionStatus.PENDING, 100, now);

    await grantBrandPayout(BrandPayoutStatus.WITHDRAWN, 800, 120, now);
    await grantBrandPayout(BrandPayoutStatus.AVAILABLE, 400, 60, now);

    const response = await request(testApp)
      .get("/api/admin/financial-rollup")
      .query({ range: "all" })
      .set("Authorization", authHeader);

    expect(response.status).toBe(OK_STATUS);
    const { gateway, ledger } = response.body.data;
    expect(gateway.grossCollected).toBeGreaterThanOrEqual(1500);
    expect(gateway.refunded).toBeGreaterThanOrEqual(300);
    expect(gateway.netHeld).toBe(gateway.grossCollected - gateway.refunded);
    expect(ledger.owedToCreators.AVAILABLE).toBeGreaterThanOrEqual(200);
    expect(ledger.owedToBrands.AVAILABLE).toBeGreaterThanOrEqual(400);
    expect(ledger.platformRevenueRealized).toBeGreaterThanOrEqual(120);
  });

  it("excludes rows outside the 30d range", async () => {
    const { authHeader } = await createAdminSession();
    const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const recent = new Date();

    await createOrderWithTransaction(1000, PaymentTransactionType.PAYMENT, old);
    await createOrderWithTransaction(500, PaymentTransactionType.PAYMENT, recent);

    const response = await request(testApp)
      .get("/api/admin/financial-rollup")
      .query({ range: "30d" })
      .set("Authorization", authHeader);

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.gateway.grossCollected).toBe(500);
  });

  it("excludes rows from before the current billing cycle for range=cycle", async () => {
    const { authHeader } = await createAdminSession();
    const beforeThisMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15);
    const now = new Date();

    await createOrderWithTransaction(1000, PaymentTransactionType.PAYMENT, beforeThisMonth);
    await createOrderWithTransaction(500, PaymentTransactionType.PAYMENT, now);

    const response = await request(testApp)
      .get("/api/admin/financial-rollup")
      .query({ range: "cycle" })
      .set("Authorization", authHeader);

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.gateway.grossCollected).toBe(500);
  });
});
