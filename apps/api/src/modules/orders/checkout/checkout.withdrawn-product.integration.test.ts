import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { PaymentMethod, ProductStatus, UserRole } from "#generated/prisma/enums.js";
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

const cartCheckoutBody = {
  fullName: "Test Buyer",
  phone: "9800000000",
  address: "123 Test Street",
  city: "Kathmandu",
  paymentMethod: PaymentMethod.COD,
};

const prepareCartedProduct = async () => {
  const { userId: adminId } = await createAdminSession();
  await createActiveCommissionRule(adminId);
  await createDefaultDeliveryZone();
  const { product, size } = await createPurchasableProduct(1000);
  const buyer = await createBuyer();
  const cart = await prisma.cart.create({ data: { userId: buyer.id } });
  await prisma.cartItem.create({
    data: { cartId: cart.id, productId: product.id, sizeId: size.id, qty: 1 },
  });
  return { product, size, buyer };
};

describe("POST /api/orders/checkout — carted product withdrawn from sale", () => {
  it("refuses to sell a soft-deleted product that is still in the cart", async () => {
    const { product, size, buyer } = await prepareCartedProduct();
    await prisma.product.update({ where: { id: product.id }, data: { deletedAt: new Date() } });

    const response = await request(testApp)
      .post("/api/orders/checkout")
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER))
      .send(cartCheckoutBody);

    const remainingStock = await prisma.productSize.findUniqueOrThrow({
      where: { id: size.id },
      select: { stock: true },
    });
    expect(response.status).toBe(HTTP_STATUS.CONFLICT);
    expect(response.body.code).toBe("ITEMS_UNAVAILABLE");
    expect(remainingStock.stock).toBe(10);
  });

  it("refuses to sell a rejected product that is still in the cart", async () => {
    const { product, size, buyer } = await prepareCartedProduct();
    await prisma.product.update({
      where: { id: product.id },
      data: { status: ProductStatus.REJECTED },
    });

    const response = await request(testApp)
      .post("/api/orders/checkout")
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER))
      .send(cartCheckoutBody);

    const remainingStock = await prisma.productSize.findUniqueOrThrow({
      where: { id: size.id },
      select: { stock: true },
    });
    expect(response.status).toBe(HTTP_STATUS.CONFLICT);
    expect(response.body.code).toBe("ITEMS_UNAVAILABLE");
    expect(remainingStock.stock).toBe(10);
  });
});
