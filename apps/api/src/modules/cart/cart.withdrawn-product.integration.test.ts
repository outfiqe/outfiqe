import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { ProductStatus, UserRole } from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import {
  authHeaderFor,
  createBuyer,
  createDefaultDeliveryZone,
  createPurchasableProduct,
} from "#test/integration/order-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

beforeEach(async () => {
  await redis.flushdb();
});

const PRODUCT_PRICE = 1000;

const bagOneProduct = async () => {
  await createDefaultDeliveryZone();
  const { product, size } = await createPurchasableProduct(PRODUCT_PRICE);
  const buyer = await createBuyer();
  const cart = await prisma.cart.create({ data: { userId: buyer.id } });
  await prisma.cartItem.create({
    data: { cartId: cart.id, productId: product.id, sizeId: size.id, qty: 1 },
  });
  return { product, buyerAuthHeader: authHeaderFor(buyer.id, UserRole.CUSTOMER) };
};

describe("GET /api/cart — product withdrawn after it was bagged", () => {
  it("lists a sellable product as available", async () => {
    const { buyerAuthHeader } = await bagOneProduct();

    const response = await request(testApp).get("/api/cart").set("Authorization", buyerAuthHeader);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data.items[0]).toMatchObject({ soldOut: false, unavailable: false });
    expect(response.body.data.subtotal).toBe(PRODUCT_PRICE);
  });

  it("lists a rejected product as unavailable and leaves it out of the totals", async () => {
    const { product, buyerAuthHeader } = await bagOneProduct();
    await prisma.product.update({
      where: { id: product.id },
      data: { status: ProductStatus.REJECTED },
    });

    const response = await request(testApp).get("/api/cart").set("Authorization", buyerAuthHeader);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data.items[0]).toMatchObject({
      soldOut: true,
      unavailable: true,
      availableStock: 0,
    });
    expect(response.body.data.subtotal).toBe(0);
    expect(response.body.data.itemCount).toBe(0);
  });

  it("lists a soft-deleted product as unavailable", async () => {
    const { product, buyerAuthHeader } = await bagOneProduct();
    await prisma.product.update({ where: { id: product.id }, data: { deletedAt: new Date() } });

    const response = await request(testApp).get("/api/cart").set("Authorization", buyerAuthHeader);

    expect(response.body.data.items[0]).toMatchObject({ soldOut: true, unavailable: true });
  });
});
