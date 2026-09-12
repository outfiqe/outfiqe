import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { ProductStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const createShopper = async () =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name: "Saved Status Shopper",
      handle: `shopper-${randomUUID().slice(0, 8)}`,
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

const createApprovedProduct = async (name: string) => {
  const brand = await createBrand(`${name} Brand`);
  return prisma.product.create({
    data: {
      brandId: brand.id,
      name,
      price: 1000,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
    },
  });
};

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.CUSTOMER });
  return `Bearer ${accessToken}`;
};

describe("GET /api/products isSaved", () => {
  it("marks only the products a signed-in viewer has actually saved", async () => {
    const shopper = await createShopper();
    const savedProduct = await createApprovedProduct("Saved Status Jacket");
    const unsavedProduct = await createApprovedProduct("Unsaved Status Jacket");
    await prisma.savedProduct.create({
      data: { userId: shopper.id, productId: savedProduct.id },
    });

    const response = await request(testApp)
      .get("/api/products")
      .set("Authorization", authHeaderFor(shopper.id));

    expect(response.status).toBe(200);
    const byId = new Map(
      response.body.data.products.map((product: { id: string; isSaved: boolean }) => [
        product.id,
        product.isSaved,
      ]),
    );
    expect(byId.get(savedProduct.id)).toBe(true);
    expect(byId.get(unsavedProduct.id)).toBe(false);
  });

  it("marks everything unsaved for an anonymous caller, without erroring", async () => {
    await createApprovedProduct("Anonymous Listing Jacket");

    const response = await request(testApp).get("/api/products");

    expect(response.status).toBe(200);
    expect(
      response.body.data.products.every(
        (product: { isSaved: boolean }) => product.isSaved === false,
      ),
    ).toBe(true);
  });
});

describe("GET /api/brands/:id/products isSaved", () => {
  it("marks a saved product within a specific brand's listing", async () => {
    const shopper = await createShopper();
    const brand = await createBrand("Brand Listing Saved Status");
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        name: "Brand Listing Jacket",
        price: 1000,
        productTypeId: await ensureProductType(),
        status: ProductStatus.APPROVED,
        imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
      },
    });
    await prisma.savedProduct.create({ data: { userId: shopper.id, productId: product.id } });

    const response = await request(testApp)
      .get(`/api/brands/${brand.id}/products`)
      .set("Authorization", authHeaderFor(shopper.id));

    expect(response.status).toBe(200);
    expect(response.body.data.products[0].isSaved).toBe(true);
  });
});
