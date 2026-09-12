import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { ProductStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const createShopper = async (name: string, handle: string) =>
  prisma.user.create({
    data: {
      email: `${handle}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${handle}-${randomUUID().slice(0, 6)}`,
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

const createApprovedProduct = async (name: string, price = 1000) => {
  const brand = await createBrand(`${name} Brand`);
  return prisma.product.create({
    data: {
      brandId: brand.id,
      name,
      price,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
    },
  });
};

const authHeaderFor = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

describe("POST and DELETE /api/wishlist/:productId", () => {
  it("saves a product, then reports it as already saved on a repeat save", async () => {
    const shopper = await createShopper("Wishlist Shopper", "wishlist-shopper");
    const product = await createApprovedProduct("Wishlist Jacket");

    const first = await request(testApp)
      .post(`/api/wishlist/${product.id}`)
      .set("Authorization", authHeaderFor(shopper.id));
    expect(first.status).toBe(200);
    expect(first.body.data.saved).toBe(true);

    const second = await request(testApp)
      .post(`/api/wishlist/${product.id}`)
      .set("Authorization", authHeaderFor(shopper.id));
    expect(second.status).toBe(200);
    expect(second.body.data.saved).toBe(true);

    const savedRows = await prisma.savedProduct.count({
      where: { userId: shopper.id, productId: product.id },
    });
    expect(savedRows).toBe(1);
  });

  it("removes a saved product, then no-ops on a repeat unsave", async () => {
    const shopper = await createShopper("Unsave Shopper", "unsave-shopper");
    const product = await createApprovedProduct("Unsave Jacket");
    await prisma.savedProduct.create({ data: { userId: shopper.id, productId: product.id } });

    const first = await request(testApp)
      .delete(`/api/wishlist/${product.id}`)
      .set("Authorization", authHeaderFor(shopper.id));
    expect(first.status).toBe(200);
    expect(first.body.data.saved).toBe(false);

    const second = await request(testApp)
      .delete(`/api/wishlist/${product.id}`)
      .set("Authorization", authHeaderFor(shopper.id));
    expect(second.status).toBe(200);
    expect(second.body.data.saved).toBe(false);

    const savedRows = await prisma.savedProduct.count({
      where: { userId: shopper.id, productId: product.id },
    });
    expect(savedRows).toBe(0);
  });

  it("rejects saving a product that doesn't exist", async () => {
    const shopper = await createShopper("Missing Product Shopper", "missing-product-shopper");

    const response = await request(testApp)
      .post(`/api/wishlist/${randomUUID()}`)
      .set("Authorization", authHeaderFor(shopper.id));

    expect(response.status).toBe(404);
  });

  it("rejects an unauthenticated save", async () => {
    const product = await createApprovedProduct("Anonymous Jacket");

    const response = await request(testApp).post(`/api/wishlist/${product.id}`);

    expect(response.status).toBe(401);
  });
});
