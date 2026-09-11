import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { DiscountType, ProductStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const createBuyer = async () => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `buyer-${suffix}@outfiqe.test`,
      name: "Test Buyer",
      handle: `test-buyer-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });
};

const authHeaderFor = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const createUserWithRole = async (role: UserRole) => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `${role.toLowerCase()}-${suffix}@outfiqe.test`,
      name: `Test ${role}`,
      handle: `test-${role.toLowerCase()}-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });
};

const createDefaultDeliveryZone = () =>
  prisma.deliveryZone.create({
    data: {
      name: "Default Zone",
      isDefault: true,
      standardDeliveryFee: 100,
      freeDeliveryThreshold: 5000,
      codHandlingFee: 0,
    },
  });

const createPurchasableProduct = async (price: number) => {
  const brand = await prisma.brand.create({
    data: {
      name: `Cart Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Cart Jacket",
      price,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: 10 },
  });
  return { brand, product, size };
};

describe("cart is for shoppers only", () => {
  it("lets a CUSTOMER read and add to their cart", async () => {
    await createDefaultDeliveryZone();
    const buyer = await createBuyer();
    const { product, size } = await createPurchasableProduct(1_000);

    const addResponse = await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: product.id, sizeId: size.id, qty: 1 });
    expect(addResponse.status).toBe(200);

    const getResponse = await request(testApp)
      .get("/api/cart")
      .set("Authorization", authHeaderFor(buyer.id));
    expect(getResponse.status).toBe(200);
  });

  it("rejects a BRAND_OWNER from reading or adding to a cart", async () => {
    const owner = await createUserWithRole(UserRole.BRAND_OWNER);
    const { product, size } = await createPurchasableProduct(1_000);

    const getResponse = await request(testApp)
      .get("/api/cart")
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER));
    expect(getResponse.status).toBe(403);

    const addResponse = await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send({ productId: product.id, sizeId: size.id, qty: 1 });
    expect(addResponse.status).toBe(403);
  });

  it("rejects an ADMIN from adding to a cart", async () => {
    const admin = await createUserWithRole(UserRole.ADMIN);
    const { product, size } = await createPurchasableProduct(1_000);

    const response = await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN))
      .send({ productId: product.id, sizeId: size.id, qty: 1 });
    expect(response.status).toBe(403);
  });
});

describe("GET /api/cart — brand-funded discounts", () => {
  it("shows the full price when the product has no active discount", async () => {
    await createDefaultDeliveryZone();
    const buyer = await createBuyer();
    const { product, size } = await createPurchasableProduct(2_000);

    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: product.id, sizeId: size.id, qty: 1 });

    const response = await request(testApp)
      .get("/api/cart")
      .set("Authorization", authHeaderFor(buyer.id));

    expect(response.status).toBe(200);
    const item = response.body.data.items[0];
    expect(item.unitPrice).toBe(2_000);
    expect(item.listUnitPrice).toBe(2_000);
    expect(item.discountPercent).toBeNull();
    expect(response.body.data.subtotal).toBe(2_000);
  });

  it("shows the discounted price and rolls it into the subtotal", async () => {
    await createDefaultDeliveryZone();
    const buyer = await createBuyer();
    const { product, size } = await createPurchasableProduct(2_000);
    const admin = await prisma.user.create({
      data: {
        email: `${randomUUID()}@outfiqe.test`,
        name: "Admin",
        handle: `admin-${randomUUID().slice(0, 8)}`,
        phone: uniquePhone(),
        passwordHash: "not-used-in-tests",
        role: UserRole.ADMIN,
      },
    });
    await prisma.productDiscount.create({
      data: {
        productId: product.id,
        createdById: admin.id,
        discountType: DiscountType.PERCENT,
        percentBasisPoints: 2_500,
        startsAt: new Date(Date.now() - 1000),
        endsAt: null,
      },
    });

    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: product.id, sizeId: size.id, qty: 2 });

    const response = await request(testApp)
      .get("/api/cart")
      .set("Authorization", authHeaderFor(buyer.id));

    expect(response.status).toBe(200);
    const item = response.body.data.items[0];
    expect(item.unitPrice).toBe(1_500);
    expect(item.listUnitPrice).toBe(2_000);
    expect(item.discountPercent).toBe(25);
    expect(response.body.data.subtotal).toBe(3_000);
  });
});
