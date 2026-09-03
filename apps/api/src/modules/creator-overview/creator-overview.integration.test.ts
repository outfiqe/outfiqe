import { randomUUID } from "node:crypto";

import { startOfDay } from "date-fns/startOfDay";
import { subDays } from "date-fns/subDays";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  CommissionSource,
  CommissionStatus,
  CreatorStatus,
  PaymentMethod,
  ProductStatus,
  ProductType,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const OK_STATUS = 200;
const FORBIDDEN_STATUS = 403;
const TREND_WINDOW_DAYS = 30;

beforeEach(async () => {
  await redis.flushdb();
});

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.CUSTOMER });
  return `Bearer ${accessToken}`;
};

const createUser = async (overrides: Record<string, unknown> = {}) => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `overview-${suffix}@outfiqe.test`,
      name: "Overview Tester",
      handle: `overview-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
      ...overrides,
    },
  });
};

const createApprovedCreator = () =>
  createUser({ isCreator: true, creatorStatus: CreatorStatus.APPROVED, followerCount: 7 });

const seedCommission = async (
  creatorId: string,
  status: CommissionStatus,
  amount: number,
  createdAt: Date,
) => {
  const tier = await prisma.commissionTier.create({
    data: { minPrice: 0, maxPrice: null, amount, sortOrder: 0 },
  });
  const buyer = await createUser();
  const brand = await prisma.brand.create({
    data: {
      name: `Overview Brand ${randomUUID().slice(0, 6)}`,
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
      type: ProductType.TOPS,
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
      creatorId,
      orderItemId,
      source: CommissionSource.TAG_CLICK,
      tierId: tier.id,
      amount,
      status,
      createdAt,
    },
  });
};

const getOverview = (authHeader: string) =>
  request(testApp).get("/api/creators/me/overview").set("Authorization", authHeader);

describe("GET /api/creators/me/overview", () => {
  it("rejects a user who is not an approved creator", async () => {
    const shopper = await createUser();

    const response = await getOverview(authHeaderFor(shopper.id));

    expect(response.status).toBe(FORBIDDEN_STATUS);
  });

  it("returns a full 30-day zero-filled trend for a creator with no activity", async () => {
    const creator = await createApprovedCreator();

    const response = await getOverview(authHeaderFor(creator.id));

    expect(response.status).toBe(OK_STATUS);
    const { kpis, trend, recentCommissions } = response.body.data;
    expect(kpis).toMatchObject({
      totalEarnings: 0,
      pendingEarnings: 0,
      availableEarnings: 0,
      last30DaysEarnings: 0,
      previous30DaysEarnings: 0,
      lookCount: 0,
      followerCount: 7,
      totalLikes: 0,
    });
    expect(trend).toHaveLength(TREND_WINDOW_DAYS);
    expect(trend.every((point: { earnings: number }) => point.earnings === 0)).toBe(true);
    expect(recentCommissions).toEqual([]);
  });

  it("aggregates earnings, looks, likes and a running trend in the database", async () => {
    const creator = await createApprovedCreator();
    const today = startOfDay(new Date());

    await seedCommission(creator.id, CommissionStatus.PENDING, 400, subDays(today, 1));
    await seedCommission(creator.id, CommissionStatus.AVAILABLE, 250, subDays(today, 3));
    await seedCommission(creator.id, CommissionStatus.PAID, 100, subDays(today, 3));
    await seedCommission(creator.id, CommissionStatus.VOIDED, 999, subDays(today, 2));
    await seedCommission(creator.id, CommissionStatus.PAID, 500, subDays(today, 45));

    await prisma.creatorLook.createMany({
      data: [
        { creatorId: creator.id, imageUrl: "a.jpg", likeCount: 5, createdAt: subDays(today, 2) },
        { creatorId: creator.id, imageUrl: "b.jpg", likeCount: 3, createdAt: subDays(today, 2) },
      ],
    });

    const response = await getOverview(authHeaderFor(creator.id));

    expect(response.status).toBe(OK_STATUS);
    const { kpis, trend, recentCommissions } = response.body.data;

    expect(kpis.totalEarnings).toBe(400 + 250 + 100 + 500);
    expect(kpis.pendingEarnings).toBe(400);
    expect(kpis.availableEarnings).toBe(250);
    expect(kpis.last30DaysEarnings).toBe(400 + 250 + 100);
    expect(kpis.lookCount).toBe(2);
    expect(kpis.totalLikes).toBe(8);

    const trendTotal = trend.reduce(
      (sum: number, point: { earnings: number }) => sum + point.earnings,
      0,
    );
    expect(trendTotal).toBe(400 + 250 + 100);

    const lastPoint = trend.at(-1);
    expect(lastPoint.cumulativeEarnings).toBe(400 + 250 + 100);
    const looksTotal = trend.reduce(
      (sum: number, point: { looks: number }) => sum + point.looks,
      0,
    );
    expect(looksTotal).toBe(2);

    expect(recentCommissions).toHaveLength(5);
    expect(recentCommissions[0]).toMatchObject({ amount: 400, status: CommissionStatus.PENDING });
  });

  it("caps recent commissions at five", async () => {
    const creator = await createApprovedCreator();
    const today = startOfDay(new Date());

    for (let index = 0; index < 7; index += 1) {
      await seedCommission(
        creator.id,
        CommissionStatus.PENDING,
        100 + index,
        subDays(today, index),
      );
    }

    const response = await getOverview(authHeaderFor(creator.id));

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.recentCommissions).toHaveLength(5);
  });
});
