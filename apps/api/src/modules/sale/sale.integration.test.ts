import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { AccountStatus, DiscountType, ProductStatus, UserRole } from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
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
  overrides: { brandId?: string; stock?: number } = {},
) => {
  const brandId = overrides.brandId ?? (await createBrand()).id;
  const product = await prisma.product.create({
    data: {
      brandId,
      name: "Sale Jacket",
      price,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
    },
  });
  await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: overrides.stock ?? 10 },
  });
  return product;
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
