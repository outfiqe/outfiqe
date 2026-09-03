import { randomUUID } from "node:crypto";

import { startOfDay } from "date-fns/startOfDay";
import { subDays } from "date-fns/subDays";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  BrandRole,
  FulfilmentStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  ProductType,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const OK_STATUS = 200;
const NOT_FOUND_STATUS = 404;
const TREND_WINDOW_DAYS = 30;

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

const createBrandWithMember = async () => {
  const brand = await prisma.brand.create({
    data: {
      name: `Overview Brand ${randomUUID().slice(0, 6)}`,
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

const createProductWithStock = (brandId: string, stock: number) =>
  prisma.product.create({
    data: {
      brandId,
      name: "Item",
      price: 1000,
      type: ProductType.TOPS,
      status: ProductStatus.APPROVED,
      sizes: { create: [{ label: "M", stock }] },
    },
    include: { sizes: true },
  });

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
  await prisma.order.create({
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
      items: { create: [{ productId, sizeId, qty, unitPrice }] },
    },
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
    expect(kpis.unfulfilledItemCount).toBe(1);

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
    expect(recentOrders[0]).toMatchObject({ qty: 2, unitPrice: 1000 });
  });
});
