import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  AccountStatus,
  CategoryStatus,
  DiscountType,
  PaymentMethod,
  ProductStatus,
  TagReviewStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import { saleService } from "./sale.service.js";
import type { ScoredSaleCandidate } from "./sale.types.js";

const SALE_CACHE_KEY = redisKeys.cache("product-sale", "global");

beforeEach(async () => {
  await redis.flushdb();
});

const createAdmin = () =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name: "Test Admin",
      handle: `admin-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.ADMIN,
    },
  });

const createBrand = (overrides: { accountStatus?: AccountStatus } = {}) =>
  prisma.brand.create({
    data: {
      name: `Sale Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
      accountStatus: overrides.accountStatus ?? AccountStatus.ACTIVE,
    },
  });

const createStockedProduct = async (
  price: number,
  overrides: {
    brandId?: string;
    stock?: number;
    categoryIds?: string[];
    productTypeSlug?: string;
  } = {},
) => {
  const brandId = overrides.brandId ?? (await createBrand()).id;
  const product = await prisma.product.create({
    data: {
      brandId,
      name: "Sale Jacket",
      price,
      productTypeId: await ensureProductType(overrides.productTypeSlug ?? "tops"),
      status: ProductStatus.APPROVED,
      categories: overrides.categoryIds
        ? { connect: overrides.categoryIds.map((id) => ({ id })) }
        : undefined,
    },
  });
  await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: overrides.stock ?? 10 },
  });
  return product;
};

const createCategory = () =>
  prisma.category.create({
    data: {
      name: `Sale Category ${randomUUID().slice(0, 6)}`,
      slug: `sale-category-${randomUUID().slice(0, 8)}`,
      status: CategoryStatus.PUBLISHED,
      sortOrder: 0,
    },
  });

const createShopper = () =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name: "Test Shopper",
      handle: `shopper-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });

const authHeaderFor = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const createDiscount = (
  productId: string,
  createdById: string,
  overrides: Partial<{
    percentBasisPoints: number;
    startsAt: Date;
    endsAt: Date | null;
    isActive: boolean;
  }> = {},
) =>
  prisma.productDiscount.create({
    data: {
      productId,
      createdById,
      discountType: DiscountType.PERCENT,
      percentBasisPoints: overrides.percentBasisPoints ?? 2_000,
      fixedAmount: null,
      startsAt: overrides.startsAt ?? new Date(Date.now() - 1000),
      endsAt: overrides.endsAt ?? null,
      isActive: overrides.isActive ?? true,
    },
  });

const readCachedSalePool = async (): Promise<ScoredSaleCandidate[]> => {
  const raw = await redis.get(SALE_CACHE_KEY);
  return raw ? (JSON.parse(raw) as ScoredSaleCandidate[]) : [];
};

describe("saleService.runScoring", () => {
  it("includes an actively-discounted, in-stock, approved product", async () => {
    const admin = await createAdmin();
    const product = await createStockedProduct(1_000);
    await createDiscount(product.id, admin.id);

    await saleService.runScoring();
    const pool = await readCachedSalePool();

    expect(pool.map((entry) => entry.productId)).toContain(product.id);
  });

  it("excludes a product with no discount at all", async () => {
    const product = await createStockedProduct(1_000);

    await saleService.runScoring();
    const pool = await readCachedSalePool();

    expect(pool.map((entry) => entry.productId)).not.toContain(product.id);
  });

  it("excludes a product whose discount has already ended", async () => {
    const admin = await createAdmin();
    const product = await createStockedProduct(1_000);
    await createDiscount(product.id, admin.id, {
      startsAt: new Date(Date.now() - 10_000),
      endsAt: new Date(Date.now() - 1_000),
    });

    await saleService.runScoring();
    const pool = await readCachedSalePool();

    expect(pool.map((entry) => entry.productId)).not.toContain(product.id);
  });

  it("excludes a product whose discount hasn't started yet", async () => {
    const admin = await createAdmin();
    const product = await createStockedProduct(1_000);
    await createDiscount(product.id, admin.id, { startsAt: new Date(Date.now() + 60_000) });

    await saleService.runScoring();
    const pool = await readCachedSalePool();

    expect(pool.map((entry) => entry.productId)).not.toContain(product.id);
  });

  it("excludes a product with an explicitly deactivated discount", async () => {
    const admin = await createAdmin();
    const product = await createStockedProduct(1_000);
    await createDiscount(product.id, admin.id, { isActive: false });

    await saleService.runScoring();
    const pool = await readCachedSalePool();

    expect(pool.map((entry) => entry.productId)).not.toContain(product.id);
  });

  it("excludes a discounted product that is out of stock", async () => {
    const admin = await createAdmin();
    const product = await createStockedProduct(1_000, { stock: 0 });
    await createDiscount(product.id, admin.id);

    await saleService.runScoring();
    const pool = await readCachedSalePool();

    expect(pool.map((entry) => entry.productId)).not.toContain(product.id);
  });

  it("excludes a discounted product from a suspended brand", async () => {
    const admin = await createAdmin();
    const brand = await createBrand({ accountStatus: AccountStatus.SUSPENDED });
    const product = await createStockedProduct(1_000, { brandId: brand.id });
    await createDiscount(product.id, admin.id);

    await saleService.runScoring();
    const pool = await readCachedSalePool();

    expect(pool.map((entry) => entry.productId)).not.toContain(product.id);
  });

  it("ranks a deeper discount above a shallower one", async () => {
    const admin = await createAdmin();
    const shallow = await createStockedProduct(1_000);
    await createDiscount(shallow.id, admin.id, { percentBasisPoints: 1_000 });
    const deep = await createStockedProduct(1_000);
    await createDiscount(deep.id, admin.id, { percentBasisPoints: 4_000 });

    await saleService.runScoring();
    const pool = await readCachedSalePool();

    const shallowEntry = pool.find((entry) => entry.productId === shallow.id);
    const deepEntry = pool.find((entry) => entry.productId === deep.id);

    expect(deepEntry?.score ?? 0).toBeGreaterThan(shallowEntry?.score ?? 0);
  });

  it("caches an empty ranked pool without throwing when nothing is on sale", async () => {
    await saleService.runScoring();
    const pool = await readCachedSalePool();

    expect(pool).toEqual([]);
  });
});

describe("GET /api/admin/sale/products", () => {
  it("requires authentication", async () => {
    const response = await request(testApp).get("/api/admin/sale/products");

    expect(response.status).toBe(401);
  });

  it("lists ranked sale candidates for a platform-access admin", async () => {
    const { authHeader } = await createAdminSession();
    const admin = await createAdmin();
    const product = await createStockedProduct(1_000);
    await createDiscount(product.id, admin.id);

    const response = await request(testApp)
      .get("/api/admin/sale/products")
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    const productIds = (response.body.data as { productId: string }[]).map(
      (entry) => entry.productId,
    );
    expect(productIds).toContain(product.id);
  });
});

describe("GET /api/admin/sale/products/:productId/debug", () => {
  it("returns the score breakdown for a currently-discounted product", async () => {
    const { authHeader } = await createAdminSession();
    const admin = await createAdmin();
    const product = await createStockedProduct(1_000);
    await createDiscount(product.id, admin.id, { percentBasisPoints: 3_000 });

    const response = await request(testApp)
      .get(`/api/admin/sale/products/${product.id}/debug`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data.discountPercent).toBe(30);
    expect(response.body.data.rank).toBe(1);
  });

  it("returns 404 for a product that isn't currently on sale", async () => {
    const { authHeader } = await createAdminSession();
    const product = await createStockedProduct(1_000);

    const response = await request(testApp)
      .get(`/api/admin/sale/products/${product.id}/debug`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(404);
  });
});

describe("saleService.getSaleProductIds — personalization", () => {
  it("ranks a product in the viewer's saved category above an equally-discounted product in an unrelated category", async () => {
    const admin = await createAdmin();
    const shopper = await createShopper();
    const savedCategory = await createCategory();
    const otherCategory = await createCategory();

    const savedProduct = await createStockedProduct(1_000, {
      categoryIds: [savedCategory.id],
    });
    await prisma.savedProduct.create({
      data: { userId: shopper.id, productId: savedProduct.id },
    });

    const matchingCategoryDeal = await createStockedProduct(1_000, {
      categoryIds: [savedCategory.id],
    });
    await createDiscount(matchingCategoryDeal.id, admin.id, { percentBasisPoints: 2_000 });

    const unrelatedCategoryDeal = await createStockedProduct(1_000, {
      categoryIds: [otherCategory.id],
      productTypeSlug: "bottoms",
    });
    await createDiscount(unrelatedCategoryDeal.id, admin.id, { percentBasisPoints: 2_000 });

    await saleService.runScoring();

    const personalizedIds = await saleService.getSaleProductIds(shopper.id, 5);
    const matchingIndex = personalizedIds.indexOf(matchingCategoryDeal.id);
    const unrelatedIndex = personalizedIds.indexOf(unrelatedCategoryDeal.id);

    expect(matchingIndex).toBeGreaterThanOrEqual(0);
    expect(unrelatedIndex).toBeGreaterThanOrEqual(0);
    expect(matchingIndex).toBeLessThan(unrelatedIndex);
  });

  it("boosts a product tagged in a look the viewer liked", async () => {
    const admin = await createAdmin();
    const creator = await createShopper();
    const shopper = await createShopper();
    const likedCategory = await createCategory();
    const otherCategory = await createCategory();

    const look = await prisma.creatorLook.create({
      data: { creatorId: creator.id, imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg` },
    });

    const likedTagDeal = await createStockedProduct(1_000, { categoryIds: [likedCategory.id] });
    await prisma.creatorLookProduct.create({
      data: {
        creatorLookId: look.id,
        productId: likedTagDeal.id,
        reviewStatus: TagReviewStatus.APPROVED,
      },
    });
    await prisma.creatorLookLike.create({ data: { creatorLookId: look.id, userId: shopper.id } });
    await createDiscount(likedTagDeal.id, admin.id, { percentBasisPoints: 2_000 });

    const unrelatedDeal = await createStockedProduct(1_000, { categoryIds: [otherCategory.id] });
    await createDiscount(unrelatedDeal.id, admin.id, { percentBasisPoints: 2_000 });

    await saleService.runScoring();

    const personalizedIds = await saleService.getSaleProductIds(shopper.id, 5);

    expect(personalizedIds.indexOf(likedTagDeal.id)).toBeLessThan(
      personalizedIds.indexOf(unrelatedDeal.id),
    );
  });

  it("never returns a product the viewer has already purchased", async () => {
    const admin = await createAdmin();
    const shopper = await createShopper();
    const purchasedProduct = await createStockedProduct(1_000);
    await createDiscount(purchasedProduct.id, admin.id);

    const size = await prisma.productSize.findFirstOrThrow({
      where: { productId: purchasedProduct.id },
    });
    const order = await prisma.order.create({
      data: {
        userId: shopper.id,
        subtotal: 1_000,
        total: 1_000,
        deliveryFee: 0,
        codFee: 0,
        paymentMethod: PaymentMethod.COD,
        fullName: "Test Shopper",
        phone: uniquePhone(),
        address: "123 Test Street",
        city: "Kathmandu",
      },
    });
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: purchasedProduct.id,
        sizeId: size.id,
        qty: 1,
        unitPrice: 1_000,
        listUnitPrice: 1_000,
      },
    });

    await saleService.runScoring();
    const personalizedIds = await saleService.getSaleProductIds(shopper.id, 5);

    expect(personalizedIds).not.toContain(purchasedProduct.id);
  });

  it("falls back to the same ranking anonymous visitors see for a signed-in shopper with no activity", async () => {
    const admin = await createAdmin();
    const shopper = await createShopper();
    const product = await createStockedProduct(1_000);
    await createDiscount(product.id, admin.id);

    await saleService.runScoring();

    const anonymousIds = await saleService.getSaleProductIds(undefined, 5);
    const newShopperIds = await saleService.getSaleProductIds(shopper.id, 5);

    expect(newShopperIds).toEqual(anonymousIds);
  });
});

describe("GET /api/products/sale", () => {
  it("returns discounted products with no authentication required", async () => {
    const admin = await createAdmin();
    const product = await createStockedProduct(1_000);
    await createDiscount(product.id, admin.id);
    await saleService.runScoring();

    const response = await request(testApp).get("/api/products/sale");

    expect(response.status).toBe(200);
    const productIds = (response.body.data as { id: string }[]).map((entry) => entry.id);
    expect(productIds).toContain(product.id);
  });

  it("returns an empty list, not an error, when nothing is on sale", async () => {
    await saleService.runScoring();

    const response = await request(testApp).get("/api/products/sale");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it("personalizes the rail for an authenticated shopper", async () => {
    const admin = await createAdmin();
    const shopper = await createShopper();
    const savedCategory = await createCategory();
    const otherCategory = await createCategory();

    const savedProduct = await createStockedProduct(1_000, { categoryIds: [savedCategory.id] });
    await prisma.savedProduct.create({
      data: { userId: shopper.id, productId: savedProduct.id },
    });

    const matchingCategoryDeal = await createStockedProduct(1_000, {
      categoryIds: [savedCategory.id],
    });
    await createDiscount(matchingCategoryDeal.id, admin.id, { percentBasisPoints: 2_000 });
    const unrelatedCategoryDeal = await createStockedProduct(1_000, {
      categoryIds: [otherCategory.id],
      productTypeSlug: "bottoms",
    });
    await createDiscount(unrelatedCategoryDeal.id, admin.id, { percentBasisPoints: 2_000 });

    await saleService.runScoring();

    const response = await request(testApp)
      .get("/api/products/sale")
      .set("Authorization", authHeaderFor(shopper.id));

    expect(response.status).toBe(200);
    const productIds = (response.body.data as { id: string }[]).map((entry) => entry.id);
    expect(productIds.indexOf(matchingCategoryDeal.id)).toBeLessThan(
      productIds.indexOf(unrelatedCategoryDeal.id),
    );
  });
});

describe("GET /api/products?sort=on-sale", () => {
  it("returns only discounted products, deepest discount first", async () => {
    const admin = await createAdmin();
    const shallow = await createStockedProduct(1_000);
    await createDiscount(shallow.id, admin.id, { percentBasisPoints: 1_000 });
    const deep = await createStockedProduct(1_000);
    await createDiscount(deep.id, admin.id, { percentBasisPoints: 4_000 });
    const notOnSale = await createStockedProduct(1_000);

    const response = await request(testApp).get("/api/products").query({ sort: "on-sale" });

    expect(response.status).toBe(200);
    const productIds = (response.body.data.products as { id: string }[]).map((entry) => entry.id);
    expect(productIds).toContain(shallow.id);
    expect(productIds).toContain(deep.id);
    expect(productIds).not.toContain(notOnSale.id);
    expect(productIds.indexOf(deep.id)).toBeLessThan(productIds.indexOf(shallow.id));
    expect(response.body.data.total).toBe(2);
  });

  it("pages through the full sale catalog without skipping or repeating products", async () => {
    const admin = await createAdmin();
    const first = await createStockedProduct(1_000);
    await createDiscount(first.id, admin.id, { percentBasisPoints: 4_000 });
    const second = await createStockedProduct(1_000);
    await createDiscount(second.id, admin.id, { percentBasisPoints: 3_000 });

    const pageOne = await request(testApp)
      .get("/api/products")
      .query({ sort: "on-sale", limit: 1 });
    expect(pageOne.status).toBe(200);
    expect(pageOne.body.data.products).toHaveLength(1);
    expect(pageOne.body.data.products[0].id).toBe(first.id);
    expect(pageOne.body.data.nextCursor).toBeTruthy();

    const pageTwo = await request(testApp)
      .get("/api/products")
      .query({ sort: "on-sale", limit: 1, cursor: pageOne.body.data.nextCursor });
    expect(pageTwo.status).toBe(200);
    expect(pageTwo.body.data.products).toHaveLength(1);
    expect(pageTwo.body.data.products[0].id).toBe(second.id);
  });

  it("still only returns discounted products when combined with a category filter", async () => {
    const admin = await createAdmin();
    const category = await createCategory();
    const onSaleInCategory = await createStockedProduct(1_000, { categoryIds: [category.id] });
    await createDiscount(onSaleInCategory.id, admin.id);
    const notOnSaleInCategory = await createStockedProduct(1_000, {
      categoryIds: [category.id],
    });

    const response = await request(testApp)
      .get("/api/products")
      .query({ sort: "on-sale", category: category.slug });

    expect(response.status).toBe(200);
    const productIds = (response.body.data.products as { id: string }[]).map((entry) => entry.id);
    expect(productIds).toContain(onSaleInCategory.id);
    expect(productIds).not.toContain(notOnSaleInCategory.id);
  });

  it("returns an empty page, not an error, when nothing is on sale", async () => {
    const response = await request(testApp).get("/api/products").query({ sort: "on-sale" });

    expect(response.status).toBe(200);
    expect(response.body.data.products).toEqual([]);
    expect(response.body.data.total).toBe(0);
  });
});
