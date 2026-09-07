import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { BrandRole, ProductStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const createUser = async (role: UserRole) =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name: "Test User",
      handle: `user-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });

const createBrand = () =>
  prisma.brand.create({
    data: {
      name: `Discount Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });

const createBrandOwner = async (brandId: string) => {
  const owner = await createUser(UserRole.BRAND_OWNER);
  await prisma.brandMembership.create({
    data: { userId: owner.id, brandId, role: BrandRole.OWNER },
  });
  return owner;
};

const authHeaderFor = (userId: string, role: UserRole) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const setUpOwnedProduct = async (price: number) => {
  const brand = await createBrand();
  const owner = await createBrandOwner(brand.id);
  const productTypeId = await ensureProductType();
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Discountable Jacket",
      price,
      productTypeId,
      status: ProductStatus.APPROVED,
    },
  });
  return { brand, owner, product };
};

describe("POST /api/products/:id/discount", () => {
  it("creates a percent discount for the owning brand", async () => {
    const { owner, product } = await setUpOwnedProduct(2_000);

    const response = await request(testApp)
      .post(`/api/products/${product.id}/discount`)
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send({
        discountType: "PERCENT",
        percentBasisPoints: 2_000,
        startsAt: new Date().toISOString(),
      });

    expect(response.status).toBe(201);
    expect(response.body.data.discountType).toBe("PERCENT");
    expect(response.body.data.percentBasisPoints).toBe(2_000);

    const stored = await prisma.productDiscount.findFirstOrThrow({
      where: { productId: product.id },
    });
    expect(stored.isActive).toBe(true);
  });

  it("rejects a fixed discount worth more than 70% of this product's price", async () => {
    const { owner, product } = await setUpOwnedProduct(2_000);

    const response = await request(testApp)
      .post(`/api/products/${product.id}/discount`)
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send({ discountType: "FIXED", fixedAmount: 1_500, startsAt: new Date().toISOString() });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("DISCOUNT_EXCEEDS_CEILING");
  });

  it("rejects a body with both percentBasisPoints and fixedAmount", async () => {
    const { owner, product } = await setUpOwnedProduct(2_000);

    const response = await request(testApp)
      .post(`/api/products/${product.id}/discount`)
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send({
        discountType: "PERCENT",
        percentBasisPoints: 2_000,
        fixedAmount: 400,
        startsAt: new Date().toISOString(),
      });

    expect(response.status).toBe(422);
  });

  it("404s for a brand that doesn't own the product", async () => {
    const { product } = await setUpOwnedProduct(2_000);
    const otherBrand = await createBrand();
    const otherOwner = await createBrandOwner(otherBrand.id);

    const response = await request(testApp)
      .post(`/api/products/${product.id}/discount`)
      .set("Authorization", authHeaderFor(otherOwner.id, UserRole.BRAND_OWNER))
      .send({
        discountType: "PERCENT",
        percentBasisPoints: 1_000,
        startsAt: new Date().toISOString(),
      });

    expect(response.status).toBe(404);
  });

  it("deactivates a prior discount when a new one is created", async () => {
    const { owner, product } = await setUpOwnedProduct(2_000);

    const first = await request(testApp)
      .post(`/api/products/${product.id}/discount`)
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send({
        discountType: "PERCENT",
        percentBasisPoints: 1_000,
        startsAt: new Date().toISOString(),
      });
    expect(first.status).toBe(201);

    const second = await request(testApp)
      .post(`/api/products/${product.id}/discount`)
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send({
        discountType: "PERCENT",
        percentBasisPoints: 3_000,
        startsAt: new Date().toISOString(),
      });
    expect(second.status).toBe(201);

    const discounts = await prisma.productDiscount.findMany({ where: { productId: product.id } });
    expect(discounts).toHaveLength(2);
    expect(discounts.find((discount) => discount.id === first.body.data.id)?.isActive).toBe(false);
    expect(discounts.find((discount) => discount.id === second.body.data.id)?.isActive).toBe(true);
  });
});

describe("PATCH /api/products/:id/discount", () => {
  it("edits the active discount in place, keeping its id", async () => {
    const { owner, product } = await setUpOwnedProduct(2_000);
    const created = await request(testApp)
      .post(`/api/products/${product.id}/discount`)
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send({
        discountType: "PERCENT",
        percentBasisPoints: 1_000,
        startsAt: new Date().toISOString(),
      });

    const response = await request(testApp)
      .patch(`/api/products/${product.id}/discount`)
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send({ percentBasisPoints: 2_500 });

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(created.body.data.id);
    expect(response.body.data.percentBasisPoints).toBe(2_500);
  });

  it("rejects switching to a ceiling-exceeding fixed amount", async () => {
    const { owner, product } = await setUpOwnedProduct(2_000);
    await request(testApp)
      .post(`/api/products/${product.id}/discount`)
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send({ discountType: "FIXED", fixedAmount: 400, startsAt: new Date().toISOString() });

    const response = await request(testApp)
      .patch(`/api/products/${product.id}/discount`)
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send({ fixedAmount: 1_500 });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("DISCOUNT_EXCEEDS_CEILING");
  });

  it("404s when the product has no active discount", async () => {
    const { owner, product } = await setUpOwnedProduct(2_000);

    const response = await request(testApp)
      .patch(`/api/products/${product.id}/discount`)
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send({ percentBasisPoints: 2_500 });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("DISCOUNT_NOT_FOUND");
  });
});

describe("DELETE /api/products/:id/discount", () => {
  it("deactivates the active discount", async () => {
    const { owner, product } = await setUpOwnedProduct(2_000);
    await request(testApp)
      .post(`/api/products/${product.id}/discount`)
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send({
        discountType: "PERCENT",
        percentBasisPoints: 2_000,
        startsAt: new Date().toISOString(),
      });

    const response = await request(testApp)
      .delete(`/api/products/${product.id}/discount`)
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER));

    expect(response.status).toBe(200);
    const stored = await prisma.productDiscount.findFirstOrThrow({
      where: { productId: product.id },
    });
    expect(stored.isActive).toBe(false);
  });

  it("404s when there is nothing to remove", async () => {
    const { owner, product } = await setUpOwnedProduct(2_000);

    const response = await request(testApp)
      .delete(`/api/products/${product.id}/discount`)
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER));

    expect(response.status).toBe(404);
  });
});

describe("Effective price on public and brand product reads", () => {
  it("shows the discounted price and percent on the public detail endpoint", async () => {
    const { owner, product } = await setUpOwnedProduct(2_000);
    await request(testApp)
      .post(`/api/products/${product.id}/discount`)
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send({
        discountType: "PERCENT",
        percentBasisPoints: 2_500,
        startsAt: new Date().toISOString(),
      });

    const response = await request(testApp).get(`/api/products/${product.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.price).toBe(2_000);
    expect(response.body.data.effectivePrice).toBe(1_500);
    expect(response.body.data.discountPercent).toBe(25);
  });

  it("has no discount fields set when the product has no active discount", async () => {
    const { product } = await setUpOwnedProduct(2_000);

    const response = await request(testApp).get(`/api/products/${product.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.effectivePrice).toBe(2_000);
    expect(response.body.data.discountPercent).toBeNull();
  });

  it("shows the brand's own product list with the active discount and effective price", async () => {
    const { owner, product } = await setUpOwnedProduct(2_000);
    await request(testApp)
      .post(`/api/products/${product.id}/discount`)
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send({ discountType: "FIXED", fixedAmount: 500, startsAt: new Date().toISOString() });

    const response = await request(testApp)
      .get("/api/products/mine")
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER));

    expect(response.status).toBe(200);
    const listed = response.body.data.products.find(
      (candidate: { id: string }) => candidate.id === product.id,
    );
    expect(listed.effectivePrice).toBe(1_500);
    expect(listed.activeDiscount.discountType).toBe("FIXED");
    expect(listed.activeDiscount.fixedAmount).toBe(500);
  });
});
