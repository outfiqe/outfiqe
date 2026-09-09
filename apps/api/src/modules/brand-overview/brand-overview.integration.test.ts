import { randomUUID } from "node:crypto";

import { startOfDay } from "date-fns/startOfDay";
import { subDays } from "date-fns/subDays";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  BrandPayoutStatus,
  BrandRole,
  FulfilmentStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { LOW_STOCK_THRESHOLD } from "#modules/products/product.constants.js";
import { redis } from "#redis/redis.client.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import { RECENT_ORDER_LIMIT } from "./brand-overview.constants.js";

const OK_STATUS = 200;
const NOT_FOUND_STATUS = 404;
const TREND_WINDOW_DAYS = 30;
const LAST_WINDOW_ORDER_DAYS_AGO = 5;
const PREVIOUS_WINDOW_ORDER_DAYS_AGO = 40;
const BEFORE_PREVIOUS_WINDOW_ORDER_DAYS_AGO = 80;

beforeEach(async () => {
  await redis.flushdb();
});

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.BRAND_OWNER });
  return `Bearer ${accessToken}`;
};

const createUser = async (role: UserRole = UserRole.BRAND_OWNER) => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `brand-overview-${suffix}@outfiqe.test`,
      name: "Brand Overview Tester",
      handle: `brand-overview-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });
};

const createBrand = async () =>
  prisma.brand.create({
    data: {
      name: `Overview Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });

const createBrandWithMember = async () => {
  const brand = await createBrand();
  const member = await createUser();
  await prisma.brandMembership.create({
    data: { userId: member.id, brandId: brand.id, role: BrandRole.OWNER },
  });
  return { brand, member };
};

const createProductWithSizes = async (brandId: string, stockPerSize: number[]) =>
  prisma.product.create({
    data: {
      brandId,
      name: "Item",
      price: 1000,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
      sizes: {
        create: stockPerSize.map((stock, index) => ({ label: `SIZE-${index}`, stock })),
      },
    },
    include: { sizes: true },
  });

const createProductWithStock = async (brandId: string, stock: number) =>
  createProductWithSizes(brandId, [stock]);

const grantBrandPayout = async (brandId: string, netAmount: number, status: BrandPayoutStatus) => {
  const admin = await createUser(UserRole.ADMIN);
  const commissionRule = await prisma.platformCommissionRule.create({
    data: { isActive: true, updatedById: admin.id },
  });
  const product = await createProductWithStock(brandId, 10);
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
      paymentStatus: PaymentStatus.PAID,
      fulfilmentStatus: FulfilmentStatus.DELIVERED,
      items: {
        create: [
          {
            productId: product.id,
            sizeId: product.sizes[0]!.id,
            qty: 1,
            unitPrice: netAmount,
            listUnitPrice: netAmount,
          },
        ],
      },
    },
    include: { items: true },
  });
  await prisma.brandPayout.create({
    data: {
      orderItemId: order.items[0]!.id,
      brandId,
      commissionRuleId: commissionRule.id,
      grossAmount: netAmount,
      platformFee: 0,
      gatewayFee: 0,
      netAmount,
      status,
    },
  });
};

const placeOrderForProduct = async (
  productId: string,
  sizeId: string,
  qty: number,
  unitPrice: number,
  paymentStatus: PaymentStatus,
  fulfilmentStatus: FulfilmentStatus,
  createdAt: Date,
) => {
  const buyer = await createUser(UserRole.CUSTOMER);
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    select: { brandId: true },
  });
  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      fullName: "Buyer",
      phone: uniquePhone(),
      address: "Somewhere",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
      subtotal: qty * unitPrice,
      deliveryFee: 0,
      total: qty * unitPrice,
      paymentStatus,
      fulfilmentStatus,
      createdAt,
      items: { create: [{ productId, sizeId, qty, unitPrice, listUnitPrice: unitPrice }] },
    },
    include: { items: { select: { id: true } } },
  });
  const fulfilmentGroup = await prisma.orderFulfilmentGroup.create({
    data: { orderId: order.id, brandId: product.brandId, status: fulfilmentStatus },
  });
  await prisma.orderItem.update({
    where: { id: order.items[0]!.id },
    data: { fulfilmentGroupId: fulfilmentGroup.id },
  });
};

const getOverview = (authHeader: string) =>
  request(testApp).get("/api/brands/me/overview").set("Authorization", authHeader);

describe("GET /api/brands/me/overview", () => {
  it("404s for a user with no brand membership", async () => {
    const orphan = await createUser();

    const response = await getOverview(authHeaderFor(orphan.id));

    expect(response.status).toBe(NOT_FOUND_STATUS);
  });

  it("returns a full zero-filled trend for a brand with no products or orders", async () => {
    const { member } = await createBrandWithMember();

    const response = await getOverview(authHeaderFor(member.id));

    expect(response.status).toBe(OK_STATUS);
    const { kpis, trend, recentOrders } = response.body.data;
    expect(kpis).toMatchObject({
      lifetimeRevenue: 0,
      last30DaysRevenue: 0,
      previous30DaysRevenue: 0,
      availablePayout: 0,
      pendingPayout: 0,
      productCount: 0,
      lowStockCount: 0,
      unfulfilledItemCount: 0,
    });
    expect(trend).toHaveLength(TREND_WINDOW_DAYS);
    expect(trend.every((point: { revenue: number }) => point.revenue === 0)).toBe(true);
    expect(recentOrders).toEqual([]);
  });

  it("aggregates revenue, catalog counts and a daily trend in the database", async () => {
    const { brand, member } = await createBrandWithMember();
    const today = startOfDay(new Date());

    const lowStockProduct = await createProductWithStock(brand.id, 3);
    const healthyProduct = await createProductWithStock(brand.id, 40);

    await placeOrderForProduct(
      lowStockProduct.id,
      lowStockProduct.sizes[0]!.id,
      2,
      1000,
      PaymentStatus.PAID,
      FulfilmentStatus.PLACED,
      subDays(today, 1),
    );
    await placeOrderForProduct(
      healthyProduct.id,
      healthyProduct.sizes[0]!.id,
      1,
      1000,
      PaymentStatus.DUE,
      FulfilmentStatus.DELIVERED,
      subDays(today, 3),
    );
    await placeOrderForProduct(
      healthyProduct.id,
      healthyProduct.sizes[0]!.id,
      5,
      1000,
      PaymentStatus.FAILED,
      FulfilmentStatus.PLACED,
      subDays(today, 3),
    );
    await placeOrderForProduct(
      healthyProduct.id,
      healthyProduct.sizes[0]!.id,
      9,
      1000,
      PaymentStatus.PAID,
      FulfilmentStatus.PLACED,
      subDays(today, 50),
    );

    const response = await getOverview(authHeaderFor(member.id));

    expect(response.status).toBe(OK_STATUS);
    const { kpis, trend, recentOrders } = response.body.data;

    expect(kpis.lifetimeRevenue).toBe((2 + 1 + 9) * 1000);
    expect(kpis.last30DaysRevenue).toBe((2 + 1) * 1000);
    expect(kpis.productCount).toBe(2);
    expect(kpis.lowStockCount).toBe(1);
    expect(kpis.unfulfilledItemCount).toBe(2);

    const trendRevenue = trend.reduce(
      (sum: number, point: { revenue: number }) => sum + point.revenue,
      0,
    );
    expect(trendRevenue).toBe((2 + 1) * 1000);
    const trendOrders = trend.reduce(
      (sum: number, point: { orderCount: number }) => sum + point.orderCount,
      0,
    );
    expect(trendOrders).toBe(2);

    expect(recentOrders).toHaveLength(4);
    expect(recentOrders[0]).toMatchObject({
      totalQty: 2,
      itemCount: 1,
      status: FulfilmentStatus.PLACED,
    });
  });

  it("sums brand payouts into available and pending, ignoring withdrawn ones", async () => {
    const { brand, member } = await createBrandWithMember();

    await grantBrandPayout(brand.id, 4252, BrandPayoutStatus.PENDING);
    await grantBrandPayout(brand.id, 1000, BrandPayoutStatus.PENDING);
    await grantBrandPayout(brand.id, 800, BrandPayoutStatus.AVAILABLE);
    await grantBrandPayout(brand.id, 500, BrandPayoutStatus.WITHDRAWN);

    const response = await getOverview(authHeaderFor(member.id));

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.kpis.pendingPayout).toBe(4252 + 1000);
    expect(response.body.data.kpis.availablePayout).toBe(800);
  });

  it("excludes refunded, initiated and cancelled orders from revenue", async () => {
    const { brand, member } = await createBrandWithMember();
    const product = await createProductWithStock(brand.id, 40);
    const sizeId = product.sizes[0]!.id;
    const yesterday = subDays(startOfDay(new Date()), 1);

    await placeOrderForProduct(
      product.id,
      sizeId,
      3,
      1000,
      PaymentStatus.REFUNDED,
      FulfilmentStatus.PLACED,
      yesterday,
    );
    await placeOrderForProduct(
      product.id,
      sizeId,
      3,
      1000,
      PaymentStatus.INITIATED,
      FulfilmentStatus.PLACED,
      yesterday,
    );
    await placeOrderForProduct(
      product.id,
      sizeId,
      3,
      1000,
      PaymentStatus.PAID,
      FulfilmentStatus.CANCELLED,
      yesterday,
    );
    await placeOrderForProduct(
      product.id,
      sizeId,
      2,
      1000,
      PaymentStatus.PAID,
      FulfilmentStatus.PLACED,
      yesterday,
    );

    const response = await getOverview(authHeaderFor(member.id));

    const { kpis } = response.body.data;
    expect(kpis.last30DaysRevenue).toBe(2000);
    expect(kpis.lifetimeRevenue).toBe(2000);
  });

  it("scopes every figure to the caller's brand", async () => {
    const { brand, member } = await createBrandWithMember();
    const otherBrand = await createBrand();
    const yesterday = subDays(startOfDay(new Date()), 1);

    const ownProduct = await createProductWithStock(brand.id, 40);
    await placeOrderForProduct(
      ownProduct.id,
      ownProduct.sizes[0]!.id,
      2,
      1000,
      PaymentStatus.PAID,
      FulfilmentStatus.PLACED,
      yesterday,
    );

    const otherProduct = await createProductWithStock(otherBrand.id, 2);
    await placeOrderForProduct(
      otherProduct.id,
      otherProduct.sizes[0]!.id,
      5,
      1000,
      PaymentStatus.PAID,
      FulfilmentStatus.PLACED,
      yesterday,
    );
    await grantBrandPayout(otherBrand.id, 9999, BrandPayoutStatus.PENDING);

    const response = await getOverview(authHeaderFor(member.id));

    const { kpis, recentOrders } = response.body.data;
    expect(kpis.last30DaysRevenue).toBe(2000);
    expect(kpis.productCount).toBe(1);
    expect(kpis.lowStockCount).toBe(0);
    expect(kpis.pendingPayout).toBe(0);
    expect(recentOrders).toHaveLength(1);
  });

  it("counts low stock at the threshold, ignores zero stock, and sums across sizes", async () => {
    const { brand, member } = await createBrandWithMember();

    await createProductWithSizes(brand.id, [LOW_STOCK_THRESHOLD]);
    await createProductWithSizes(brand.id, [0]);
    await createProductWithSizes(brand.id, [LOW_STOCK_THRESHOLD, 3]);
    await createProductWithSizes(brand.id, [2, 2]);

    const response = await getOverview(authHeaderFor(member.id));

    const { kpis } = response.body.data;
    expect(kpis.productCount).toBe(4);
    expect(kpis.lowStockCount).toBe(2);
  });

  it("excludes soft-deleted products from catalog counts", async () => {
    const { brand, member } = await createBrandWithMember();

    await createProductWithStock(brand.id, 3);
    const deletedProduct = await createProductWithStock(brand.id, 3);
    await prisma.product.update({
      where: { id: deletedProduct.id },
      data: { deletedAt: new Date() },
    });

    const response = await getOverview(authHeaderFor(member.id));

    const { kpis } = response.body.data;
    expect(kpis.productCount).toBe(1);
    expect(kpis.lowStockCount).toBe(1);
  });

  it("caps the recent orders list at the configured limit", async () => {
    const { brand, member } = await createBrandWithMember();
    const product = await createProductWithStock(brand.id, 100);
    const today = startOfDay(new Date());
    const orderCount = RECENT_ORDER_LIMIT + 2;

    await Promise.all(
      Array.from({ length: orderCount }, (_, index) =>
        placeOrderForProduct(
          product.id,
          product.sizes[0]!.id,
          1,
          1000,
          PaymentStatus.PAID,
          FulfilmentStatus.PLACED,
          subDays(today, index + 1),
        ),
      ),
    );

    const response = await getOverview(authHeaderFor(member.id));

    expect(response.body.data.recentOrders).toHaveLength(RECENT_ORDER_LIMIT);
  });

  it("reports the previous 30-day window separately from the last 30 days", async () => {
    const { brand, member } = await createBrandWithMember();
    const product = await createProductWithStock(brand.id, 100);
    const sizeId = product.sizes[0]!.id;
    const today = startOfDay(new Date());

    await placeOrderForProduct(
      product.id,
      sizeId,
      2,
      1000,
      PaymentStatus.PAID,
      FulfilmentStatus.PLACED,
      subDays(today, LAST_WINDOW_ORDER_DAYS_AGO),
    );
    await placeOrderForProduct(
      product.id,
      sizeId,
      3,
      1000,
      PaymentStatus.PAID,
      FulfilmentStatus.PLACED,
      subDays(today, PREVIOUS_WINDOW_ORDER_DAYS_AGO),
    );
    await placeOrderForProduct(
      product.id,
      sizeId,
      1,
      1000,
      PaymentStatus.PAID,
      FulfilmentStatus.PLACED,
      subDays(today, BEFORE_PREVIOUS_WINDOW_ORDER_DAYS_AGO),
    );

    const response = await getOverview(authHeaderFor(member.id));

    const { kpis } = response.body.data;
    expect(kpis.last30DaysRevenue).toBe(2000);
    expect(kpis.previous30DaysRevenue).toBe(3000);
    expect(kpis.lifetimeRevenue).toBe(6000);
  });
});
