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
const BAD_REQUEST_STATUS = 400;

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
      items: {
        create: [
          {
            productId: product.id,
            sizeId: size.id,
            qty: 1,
            unitPrice: amount,
            listUnitPrice: amount,
          },
        ],
      },
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
          {
            productId: product.id,
            sizeId: size.id,
            qty: 1,
            unitPrice: netAmount + platformFee,
            listUnitPrice: netAmount + platformFee,
          },
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

const createSettledOrder = async (
  paymentMethod: PaymentMethod,
  platformFee: number,
  gatewayFee: number,
  createdAt: Date,
) => {
  const admin = await createUser(UserRole.ADMIN);
  const rule = await prisma.platformCommissionRule.create({
    data: { isActive: false, updatedById: admin.id },
  });
  const brand = await prisma.brand.create({
    data: {
      name: `Rollup Settled Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const buyer = await createUser();
  const netAmount = 1000;
  const total = netAmount + platformFee;
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Item",
      price: total,
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
      paymentMethod,
      subtotal: total,
      deliveryFee: 0,
      total,
      items: {
        create: [
          {
            productId: product.id,
            sizeId: size.id,
            qty: 1,
            unitPrice: total,
            listUnitPrice: total,
          },
        ],
      },
    },
    include: { items: true },
  });
  const orderItemId = order.items[0]?.id;
  if (!orderItemId) throw new Error("order item not created");

  await prisma.paymentTransaction.create({
    data: {
      orderId: order.id,
      provider: paymentMethod,
      type: PaymentTransactionType.PAYMENT,
      status: PaymentTransactionStatus.SUCCEEDED,
      createdAt,
    },
  });
  await prisma.brandPayout.create({
    data: {
      orderItemId,
      brandId: brand.id,
      commissionRuleId: rule.id,
      grossAmount: total,
      platformFee,
      gatewayFee,
      netAmount,
      status: BrandPayoutStatus.WITHDRAWN,
      createdAt,
    },
  });

  return { total };
};

const createLedgerItem = async (options: {
  paymentMethod?: PaymentMethod;
  brandPayoutStatus?: BrandPayoutStatus;
  createdAt: Date;
  withCommission?: boolean;
}) => {
  const {
    paymentMethod = PaymentMethod.COD,
    brandPayoutStatus,
    createdAt,
    withCommission,
  } = options;

  const admin = await createUser(UserRole.ADMIN);
  const rule = await prisma.platformCommissionRule.create({
    data: { isActive: false, updatedById: admin.id },
  });
  const brand = await prisma.brand.create({
    data: {
      name: `Ledger Brand ${randomUUID().slice(0, 6)}`,
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
      price: 1000,
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
      paymentMethod,
      subtotal: 1000,
      deliveryFee: 0,
      total: 1000,
      items: {
        create: [
          {
            productId: product.id,
            sizeId: size.id,
            qty: 1,
            unitPrice: 1000,
            listUnitPrice: 1000,
            createdAt,
          },
        ],
      },
    },
    include: { items: true },
  });
  const orderItemId = order.items[0]?.id;
  if (!orderItemId) throw new Error("order item not created");

  if (brandPayoutStatus) {
    await prisma.brandPayout.create({
      data: {
        orderItemId,
        brandId: brand.id,
        commissionRuleId: rule.id,
        grossAmount: 1000,
        platformFee: 50,
        gatewayFee: 0,
        netAmount: 950,
        status: brandPayoutStatus,
        createdAt,
      },
    });
  }

  if (withCommission) {
    const creator = await createUser();
    const tier = await prisma.commissionTier.create({
      data: { minPrice: 0, maxPrice: null, amount: 100, sortOrder: 0 },
    });
    await prisma.creatorCommission.create({
      data: {
        creatorId: creator.id,
        orderItemId,
        source: CommissionSource.TAG_CLICK,
        tierId: tier.id,
        amount: 100,
        status: CommissionStatus.AVAILABLE,
        createdAt,
      },
    });
  }

  return { orderId: order.id, orderItemId, createdAt };
};

describe("GET /api/admin/financial-rollup/ledger", () => {
  it("requires admin", async () => {
    const user = await createUser();
    const response = await request(testApp)
      .get("/api/admin/financial-rollup/ledger")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER));

    expect(response.status).toBe(FORBIDDEN_STATUS);
  });

  it("returns an empty page with a null cursor when there are no ledger rows", async () => {
    const { authHeader } = await createAdminSession();

    const response = await request(testApp)
      .get("/api/admin/financial-rollup/ledger")
      .query({ paymentMethod: "KHALTI" })
      .set("Authorization", authHeader);

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data).toEqual({ entries: [], nextCursor: null });
  });

  it("returns one row per order item with the linked payout and commission amounts", async () => {
    const { authHeader } = await createAdminSession();
    const now = new Date();
    const { orderId, orderItemId } = await createLedgerItem({
      brandPayoutStatus: BrandPayoutStatus.WITHDRAWN,
      createdAt: now,
      withCommission: true,
    });

    const response = await request(testApp)
      .get("/api/admin/financial-rollup/ledger")
      .set("Authorization", authHeader);

    expect(response.status).toBe(OK_STATUS);
    const { entries, nextCursor } = response.body.data;
    expect(nextCursor).toBeNull();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      orderId,
      orderItemId,
      paymentMethod: "COD",
      grossAmount: 1000,
      platformFee: 50,
      gatewayFee: 0,
      brandNetAmount: 950,
      brandPayoutStatus: "WITHDRAWN",
      creatorCommissionAmount: 100,
      creatorCommissionStatus: "AVAILABLE",
    });
  });

  it("still returns the order item when it has no brand payout or commission yet", async () => {
    const { authHeader } = await createAdminSession();
    await createLedgerItem({ createdAt: new Date() });

    const response = await request(testApp)
      .get("/api/admin/financial-rollup/ledger")
      .set("Authorization", authHeader);

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.entries[0]).toMatchObject({
      grossAmount: null,
      brandPayoutStatus: null,
      creatorCommissionAmount: null,
    });
  });

  it("paginates with a stable cursor, newest first", async () => {
    const { authHeader } = await createAdminSession();
    const base = Date.now();
    const items = [];
    for (let index = 0; index < 3; index += 1) {
      items.push(await createLedgerItem({ createdAt: new Date(base + index * 1000) }));
    }

    const firstPage = await request(testApp)
      .get("/api/admin/financial-rollup/ledger")
      .query({ limit: 2 })
      .set("Authorization", authHeader);

    expect(firstPage.status).toBe(OK_STATUS);
    expect(firstPage.body.data.entries).toHaveLength(2);
    expect(
      firstPage.body.data.entries.map((entry: { orderItemId: string }) => entry.orderItemId),
    ).toEqual([items[2]?.orderItemId, items[1]?.orderItemId]);
    expect(firstPage.body.data.nextCursor).not.toBeNull();

    const secondPage = await request(testApp)
      .get("/api/admin/financial-rollup/ledger")
      .query({ limit: 2, cursor: firstPage.body.data.nextCursor })
      .set("Authorization", authHeader);

    expect(secondPage.status).toBe(OK_STATUS);
    expect(secondPage.body.data.entries).toHaveLength(1);
    expect(secondPage.body.data.entries[0].orderItemId).toBe(items[0]?.orderItemId);
    expect(secondPage.body.data.nextCursor).toBeNull();
  });

  it("returns a null cursor when the page exactly fills the limit", async () => {
    const { authHeader } = await createAdminSession();
    const base = Date.now();
    await createLedgerItem({ createdAt: new Date(base) });
    await createLedgerItem({ createdAt: new Date(base + 1000) });

    const response = await request(testApp)
      .get("/api/admin/financial-rollup/ledger")
      .query({ limit: 2 })
      .set("Authorization", authHeader);

    expect(response.body.data.entries).toHaveLength(2);
    expect(response.body.data.nextCursor).toBeNull();
  });

  it("rejects a malformed cursor with 400", async () => {
    const { authHeader } = await createAdminSession();

    const response = await request(testApp)
      .get("/api/admin/financial-rollup/ledger")
      .query({ cursor: "not-a-real-cursor" })
      .set("Authorization", authHeader);

    expect(response.status).toBe(BAD_REQUEST_STATUS);
  });

  it("filters by payment method and brand payout status", async () => {
    const { authHeader } = await createAdminSession();
    const now = new Date();
    await createLedgerItem({
      paymentMethod: PaymentMethod.COD,
      brandPayoutStatus: BrandPayoutStatus.WITHDRAWN,
      createdAt: now,
    });
    await createLedgerItem({
      paymentMethod: PaymentMethod.ESEWA,
      brandPayoutStatus: BrandPayoutStatus.PENDING,
      createdAt: now,
    });

    const response = await request(testApp)
      .get("/api/admin/financial-rollup/ledger")
      .query({ paymentMethod: "ESEWA", brandPayoutStatus: "PENDING" })
      .set("Authorization", authHeader);

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.entries).toHaveLength(1);
    expect(response.body.data.entries[0].paymentMethod).toBe("ESEWA");
  });

  it("filters by date range", async () => {
    const { authHeader } = await createAdminSession();
    const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const recent = new Date();
    await createLedgerItem({ createdAt: old });
    await createLedgerItem({ createdAt: recent });

    const response = await request(testApp)
      .get("/api/admin/financial-rollup/ledger")
      .query({ dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() })
      .set("Authorization", authHeader);

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.entries).toHaveLength(1);
  });
});

describe("GET /api/admin/financial-rollup/ledger/export", () => {
  it("requires admin", async () => {
    const user = await createUser();
    const response = await request(testApp)
      .get("/api/admin/financial-rollup/ledger/export")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER));

    expect(response.status).toBe(FORBIDDEN_STATUS);
  });

  it("streams a CSV matching the filtered ledger rows, with the right headers", async () => {
    const { authHeader } = await createAdminSession();
    const now = new Date();
    const { orderId, orderItemId } = await createLedgerItem({
      paymentMethod: PaymentMethod.COD,
      brandPayoutStatus: BrandPayoutStatus.WITHDRAWN,
      createdAt: now,
    });
    await createLedgerItem({ paymentMethod: PaymentMethod.ESEWA, createdAt: now });

    const response = await request(testApp)
      .get("/api/admin/financial-rollup/ledger/export")
      .query({ paymentMethod: "COD" })
      .set("Authorization", authHeader);

    expect(response.status).toBe(OK_STATUS);
    expect(response.headers["content-type"]).toMatch(/text\/csv/);
    expect(response.headers["content-disposition"]).toMatch(
      /attachment; filename="financial-ledger-/,
    );

    const lines = (response.text as string).split("\r\n");
    expect(lines[0]).toBe(
      "Order ID,Order Item ID,Date,Payment Method,Gross,Platform Fee,Gateway Fee,Creator Commission,Brand Net,Brand Payout Status",
    );
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain(orderId);
    expect(lines[1]).toContain(orderItemId);
    expect(lines[1]).toContain("COD");
    expect(lines[1]).not.toContain("ESEWA");
  });
});

const createOrderItemForAttribution = async (attributed: boolean, createdAt: Date) => {
  const buyer = await createUser();
  const brand = await prisma.brand.create({
    data: {
      name: `Attribution Brand ${randomUUID().slice(0, 6)}`,
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
      price: 1000,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: 5 },
  });
  const creator = attributed ? await createUser() : null;

  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      fullName: "Buyer",
      phone: uniquePhone(),
      address: "Somewhere",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
      subtotal: 1000,
      deliveryFee: 0,
      total: 1000,
      items: {
        create: [
          {
            productId: product.id,
            sizeId: size.id,
            qty: 1,
            unitPrice: 1000,
            listUnitPrice: 1000,
            createdAt,
            ...(creator
              ? { attributedCreatorId: creator.id, attributionSource: CommissionSource.TAG_CLICK }
              : {}),
          },
        ],
      },
    },
  });

  await prisma.paymentTransaction.create({
    data: {
      orderId: order.id,
      provider: PaymentMethod.COD,
      type: PaymentTransactionType.PAYMENT,
      status: PaymentTransactionStatus.SUCCEEDED,
      createdAt,
    },
  });
};

describe("GET /api/admin/financial-rollup attribution", () => {
  it("counts the attributed-vs-total order items added since the last read", async () => {
    const { authHeader } = await createAdminSession();
    const now = new Date();

    const before = await request(testApp)
      .get("/api/admin/financial-rollup")
      .query({ range: "all" })
      .set("Authorization", authHeader);

    await createOrderItemForAttribution(true, now);
    await createOrderItemForAttribution(true, now);
    await createOrderItemForAttribution(false, now);

    const after = await request(testApp)
      .get("/api/admin/financial-rollup")
      .query({ range: "all" })
      .set("Authorization", authHeader);

    expect(after.status).toBe(OK_STATUS);
    const totalDelta =
      after.body.data.attribution.totalItems - before.body.data.attribution.totalItems;
    const attributedDelta =
      after.body.data.attribution.attributedItems - before.body.data.attribution.attributedItems;

    expect(totalDelta).toBe(3);
    expect(attributedDelta).toBe(2);
    expect(after.body.data.attribution.attributedShare).toBeCloseTo(
      after.body.data.attribution.attributedItems / after.body.data.attribution.totalItems,
    );
  });
});

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
    await grantCommission(CommissionStatus.PAID, 5000, now);
    await grantCommission(CommissionStatus.VOIDED, 700, now);

    await grantBrandPayout(BrandPayoutStatus.WITHDRAWN, 800, 120, now);
    await grantBrandPayout(BrandPayoutStatus.AVAILABLE, 400, 60, now);
    await grantBrandPayout(BrandPayoutStatus.VOIDED, 900, 0, now);

    const response = await request(testApp)
      .get("/api/admin/financial-rollup")
      .query({ range: "all" })
      .set("Authorization", authHeader);

    expect(response.status).toBe(OK_STATUS);
    const { gateway, ledger } = response.body.data;
    expect(gateway.grossCollected).toBeGreaterThanOrEqual(1500);
    expect(gateway.refunded).toBeGreaterThanOrEqual(300);
    expect(gateway.netHeld).toBe(gateway.grossCollected - gateway.refunded);

    expect(ledger.owedToCreators).toBe(300);
    expect(ledger.owedToBrands).toBe(400);
    expect(ledger.creatorCommissionsByStatus.PAID).toBe(5000);
    expect(ledger.creatorCommissionsByStatus.VOIDED).toBe(700);
    expect(ledger.brandPayoutsByStatus.WITHDRAWN).toBe(800);
    expect(ledger.brandPayoutsByStatus.VOIDED).toBe(900);
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

  it("breaks GMV, order count, and realized take rate down by payment method", async () => {
    const { authHeader } = await createAdminSession();
    const now = new Date();

    const codPlatformFee = 50;
    const cod = await createSettledOrder(PaymentMethod.COD, codPlatformFee, 0, now);
    const esewaPlatformFee = 100;
    const esewaGatewayFee = 30;
    const esewa = await createSettledOrder(
      PaymentMethod.ESEWA,
      esewaPlatformFee,
      esewaGatewayFee,
      now,
    );

    const response = await request(testApp)
      .get("/api/admin/financial-rollup")
      .query({ range: "all" })
      .set("Authorization", authHeader);

    expect(response.status).toBe(OK_STATUS);
    const { byPaymentMethod } = response.body.data;

    expect(byPaymentMethod.COD).toEqual({
      gmv: cod.total,
      orderCount: 1,
      realizedTakeRate: codPlatformFee / cod.total,
    });
    expect(byPaymentMethod.ESEWA).toEqual({
      gmv: esewa.total,
      orderCount: 1,
      realizedTakeRate: (esewaPlatformFee - esewaGatewayFee) / esewa.total,
    });
    expect(byPaymentMethod.KHALTI).toBeUndefined();
  });
});
