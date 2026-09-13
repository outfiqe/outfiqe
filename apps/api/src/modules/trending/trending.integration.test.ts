import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { PaymentMethod, PaymentStatus, ProductStatus } from "#generated/prisma/enums.js";
import { decodeCursor } from "#lib/pagination.utils.js";
import { truncateToHour } from "#lib/trend-scoring.utils.js";
import { trendingRepository } from "#modules/trending/trending.repository.js";
import { trendingService } from "#modules/trending/trending.service.js";
import type { TrendingSnapshotCursor } from "#modules/trending/trending.types.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const HOUR_MS = 60 * 60 * 1000;
const OK_STATUS = 200;

beforeEach(async () => {
  await redis.flushdb();
});

const createShopper = async (label: string) =>
  prisma.user.create({
    data: {
      email: `${label}-${randomUUID()}@outfiqe.test`,
      name: label,
      handle: `${label}-${randomUUID().slice(0, 6)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
    },
  });

const createBrand = async (name: string) =>
  prisma.brand.create({
    data: {
      name,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });

const createApprovedProduct = async (
  name: string,
  overrides: { brandId?: string; createdAt?: Date; productTypeId?: string } = {},
) => {
  const brandId = overrides.brandId ?? (await createBrand(`${name} Brand`)).id;
  return prisma.product.create({
    data: {
      brandId,
      name,
      price: 1000,
      productTypeId: overrides.productTypeId ?? (await ensureProductType()),
      status: ProductStatus.APPROVED,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
      createdAt: overrides.createdAt,
    },
  });
};

const saveProduct = async (userId: string, productId: string, createdAt: Date) =>
  prisma.savedProduct.create({ data: { userId, productId, createdAt } });

describe("trendingRepository.upsertHourlyMetrics boundary finalization", () => {
  it("finalizes an hour's bucket with activity that arrives after aggregation has already moved on to the next hour", async () => {
    const product = await createApprovedProduct("Boundary Gap Product");
    const saverA = await createShopper("boundary-saver-a");
    const saverB = await createShopper("boundary-saver-b");

    const hourOneStart = truncateToHour(new Date(Date.now() - 2 * HOUR_MS));
    const hourTwoStart = new Date(hourOneStart.getTime() + HOUR_MS);

    await saveProduct(saverA.id, product.id, new Date(hourOneStart.getTime() + 10 * 60 * 1000));
    await trendingRepository.upsertHourlyMetrics(hourOneStart);

    await saveProduct(saverB.id, product.id, new Date(hourOneStart.getTime() + 50 * 60 * 1000));
    await trendingRepository.upsertHourlyMetrics(hourTwoStart);

    const hourOneBucket = await prisma.productTrendMetric.findUnique({
      where: { productId_bucketStart: { productId: product.id, bucketStart: hourOneStart } },
    });
    const hourTwoBucket = await prisma.productTrendMetric.findUnique({
      where: { productId_bucketStart: { productId: product.id, bucketStart: hourTwoStart } },
    });
    const totalCountedSaves = (hourOneBucket?.saves ?? 0) + (hourTwoBucket?.saves ?? 0);

    expect(totalCountedSaves).toBe(2);
  });

  it("bounds the purchase-units bucket to its own hour using the order item's own created_at", async () => {
    const product = await createApprovedProduct("Boundary Purchase Product");
    const buyer = await createShopper("boundary-buyer");
    const size = await prisma.productSize.create({
      data: { productId: product.id, label: "M", stock: 10 },
    });

    const hourOneStart = truncateToHour(new Date(Date.now() - 2 * HOUR_MS));
    const hourTwoStart = new Date(hourOneStart.getTime() + HOUR_MS);

    const order = await prisma.order.create({
      data: {
        userId: buyer.id,
        fullName: "Buyer",
        phone: uniquePhone(),
        address: "Somewhere",
        city: "Kathmandu",
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.PAID,
        subtotal: 1000,
        deliveryFee: 0,
        total: 1000,
        createdAt: hourTwoStart,
      },
    });
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product.id,
        sizeId: size.id,
        qty: 3,
        unitPrice: 1000,
        listUnitPrice: 1000,
        createdAt: new Date(hourOneStart.getTime() + 55 * 60 * 1000),
      },
    });

    await trendingRepository.upsertHourlyMetrics(hourTwoStart);

    const hourOneBucket = await prisma.productTrendMetric.findUnique({
      where: { productId_bucketStart: { productId: product.id, bucketStart: hourOneStart } },
    });
    const hourTwoBucket = await prisma.productTrendMetric.findUnique({
      where: { productId_bucketStart: { productId: product.id, bucketStart: hourTwoStart } },
    });

    expect(hourOneBucket?.purchaseUnits ?? 0).toBe(3);
    expect(hourTwoBucket?.purchaseUnits ?? 0).toBe(0);
  });
});

describe("trendingService cached-id read-time revalidation", () => {
  it("drops a product from the trending rail once it's deleted, even while the score cache is warm", async () => {
    const product = await createApprovedProduct("Stale Trending Product");
    const saver = await createShopper("stale-trending-saver");
    await saveProduct(saver.id, product.id, new Date());

    await trendingService.runAggregation();
    await trendingService.runScoring();

    const before = await request(testApp).get("/api/products/trending");
    expect(before.status).toBe(OK_STATUS);
    expect(before.body.data.map((entry: { id: string }) => entry.id)).toContain(product.id);

    await prisma.product.update({ where: { id: product.id }, data: { deletedAt: new Date() } });

    const after = await request(testApp).get("/api/products/trending");
    expect(after.status).toBe(OK_STATUS);
    expect(after.body.data.map((entry: { id: string }) => entry.id)).not.toContain(product.id);
  });
});

describe("trendingService.listTrendingProductIds pagination", () => {
  it("resumes from where it left off instead of rewinding to page one when the session snapshot expires mid-scroll", async () => {
    const brand = await createBrand("Resume Pagination Brand");
    const topProduct = await createApprovedProduct("Resume Pagination Top Product", {
      brandId: brand.id,
    });
    const secondProduct = await createApprovedProduct("Resume Pagination Second Product", {
      brandId: brand.id,
    });
    const saverOne = await createShopper("resume-saver-one");
    const saverTwo = await createShopper("resume-saver-two");

    await saveProduct(saverOne.id, topProduct.id, new Date());
    await saveProduct(saverTwo.id, topProduct.id, new Date());
    await saveProduct(saverOne.id, secondProduct.id, new Date());

    await trendingRepository.upsertHourlyMetrics(truncateToHour(new Date()));

    const first = await request(testApp).get("/api/products").query({ sort: "trending", limit: 1 });
    expect(first.status).toBe(OK_STATUS);
    expect(first.body.data.products[0]?.id).toBe(topProduct.id);
    expect(first.body.data.nextCursor).not.toBeNull();

    const firstCursor = decodeCursor<TrendingSnapshotCursor>(first.body.data.nextCursor);
    await redis.del(redisKeys.cache("product-trending-snapshot", firstCursor?.sessionId ?? ""));

    const second = await request(testApp)
      .get("/api/products")
      .query({ sort: "trending", limit: 1, cursor: first.body.data.nextCursor });

    expect(second.status).toBe(OK_STATUS);
    expect(second.body.data.products[0]?.id).toBe(secondProduct.id);
  });
});

describe("trendingService candidate ranking determinism and diversity", () => {
  it("breaks equally-scored candidates by productId instead of leaving the order to chance", async () => {
    const productType = await ensureProductType();
    const productCreatedAt = new Date(Date.now() - 30 * 24 * HOUR_MS);
    const productOne = await createApprovedProduct("Tie Break Product One", {
      productTypeId: productType,
      createdAt: productCreatedAt,
    });
    const productTwo = await createApprovedProduct("Tie Break Product Two", {
      productTypeId: productType,
      createdAt: productCreatedAt,
    });
    const isProductOneSmaller = productOne.id.localeCompare(productTwo.id) <= 0;
    const smaller = isProductOneSmaller ? productOne : productTwo;
    const larger = isProductOneSmaller ? productTwo : productOne;

    const bucketStart = truncateToHour(new Date(Date.now() - 2 * HOUR_MS));
    await prisma.productTrendMetric.create({
      data: { productId: larger.id, bucketStart, saves: 5 },
    });
    await prisma.productTrendMetric.create({
      data: { productId: smaller.id, bucketStart, saves: 5 },
    });

    const ranked = await trendingService.listTopTrendingProducts(2);

    expect(ranked.map((entry) => entry.productId)).toEqual([smaller.id, larger.id]);
  });

  it("caps candidates from the same brand in the homepage rail's ranked ids", async () => {
    const brand = await createBrand("Diversity Cap Brand");
    const now = new Date();
    const saver = await createShopper("diversity-saver");
    const bucketStart = truncateToHour(now);

    const brandProducts = await Promise.all(
      Array.from({ length: 3 }, (_, index) =>
        createApprovedProduct(`Diversity Cap Product ${index}`, { brandId: brand.id }),
      ),
    );
    for (const product of brandProducts) {
      await saveProduct(saver.id, product.id, now);
    }
    await prisma.productTrendMetric.createMany({
      data: brandProducts.map((product) => ({ productId: product.id, bucketStart, saves: 5 })),
    });

    await trendingService.runScoring();
    const rankedIds = await trendingService.getTrendingProductIds(50);

    const brandProductIds = new Set(brandProducts.map((product) => product.id));
    const rankedFromBrand = rankedIds.filter((id) => brandProductIds.has(id));

    expect(rankedFromBrand.length).toBeLessThanOrEqual(2);
  });
});
