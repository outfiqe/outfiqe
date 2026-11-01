import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { PaymentMethod, UserRole } from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/auth-helpers.js";
import {
  authHeaderFor,
  createActiveCommissionRule,
  createBuyer,
  createDefaultDeliveryZone,
  createPurchasableProduct,
} from "#test/integration/order-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

beforeEach(async () => {
  await redis.flushdb();
});

const CHEAP_PRICE = 100;
const EXPENSIVE_PRICE = 5000;

describe("cart item whose size belongs to a different product", () => {
  it("is rejected instead of being priced from the wrong product", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const cheap = await createPurchasableProduct(CHEAP_PRICE);
    const expensive = await createPurchasableProduct(EXPENSIVE_PRICE);
    const buyer = await createBuyer();
    const buyerAuthHeader = authHeaderFor(buyer.id, UserRole.CUSTOMER);

    const addToCart = await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", buyerAuthHeader)
      .send({ productId: cheap.product.id, sizeId: expensive.size.id, qty: 1 });

    const checkout = await request(testApp)
      .post("/api/orders/checkout")
      .set("Authorization", buyerAuthHeader)
      .send({
        fullName: "Test Buyer",
        phone: "9800000000",
        address: "123 Test Street",
        city: "Kathmandu",
        paymentMethod: PaymentMethod.COD,
      });

    const expensiveSize = await prisma.productSize.findUniqueOrThrow({
      where: { id: expensive.size.id },
      select: { stock: true },
    });
    const wasUnderpaidSale = checkout.status === 201 && expensiveSize.stock < 10;
    expect(wasUnderpaidSale).toBe(false);
    expect(addToCart.status).toBeGreaterThanOrEqual(400);
  });

  it("cannot be persisted as a cart row because the database rejects the pairing", async () => {
    const cheap = await createPurchasableProduct(CHEAP_PRICE);
    const expensive = await createPurchasableProduct(EXPENSIVE_PRICE);
    const buyer = await createBuyer();
    const cart = await prisma.cart.create({ data: { userId: buyer.id } });

    await expect(
      prisma.cartItem.create({
        data: { cartId: cart.id, productId: cheap.product.id, sizeId: expensive.size.id, qty: 1 },
      }),
    ).rejects.toThrow();

    const persistedMismatchedRows = await prisma.cartItem.count({ where: { cartId: cart.id } });
    expect(persistedMismatchedRows).toBe(0);
  });
});
