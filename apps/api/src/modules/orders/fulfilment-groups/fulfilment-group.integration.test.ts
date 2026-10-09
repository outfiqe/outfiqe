import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  FulfilmentStatus,
  OrderFulfilmentSummary,
  PaymentMethod,
  UserRole,
} from "#generated/prisma/enums.js";
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

describe("order fulfilment groups", () => {
  const checkoutBuyNow = async (buyerId: string, productId: string, sizeId: string) => {
    const response = await request(testApp)
      .post("/api/orders/checkout")
      .set("Authorization", authHeaderFor(buyerId, UserRole.CUSTOMER))
      .send({
        fullName: "Test Buyer",
        phone: "9800000000",
        address: "123 Test Street",
        city: "Kathmandu",
        paymentMethod: PaymentMethod.COD,
        buyNow: { productId, sizeId, qty: 1 },
      });
    expect(response.status).toBe(201);
    return response.body.data.id as string;
  };

  it("creates one group per brand at checkout and links every item to its group", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const { brand, product, size } = await createPurchasableProduct(1000);
    const buyer = await createBuyer();

    const orderId = await checkoutBuyNow(buyer.id, product.id, size.id);

    const groups = await prisma.orderFulfilmentGroup.findMany({
      where: { orderId },
      include: { items: { select: { id: true } } },
    });
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ brandId: brand.id, status: FulfilmentStatus.PLACED });
    expect(groups[0]!.items).toHaveLength(1);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.fulfilmentSummary).toBe(OrderFulfilmentSummary.UNFULFILLED);
  });

  it("splits a multi-brand cart into a group per brand, each holding only that brand's item", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const first = await createPurchasableProduct(1000);
    const second = await createPurchasableProduct(2000);
    const buyer = await createBuyer();

    const cart = await prisma.cart.create({ data: { userId: buyer.id } });
    await prisma.cartItem.createMany({
      data: [
        { cartId: cart.id, productId: first.product.id, sizeId: first.size.id, qty: 1 },
        { cartId: cart.id, productId: second.product.id, sizeId: second.size.id, qty: 1 },
      ],
    });

    const response = await request(testApp)
      .post("/api/orders/checkout")
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER))
      .send({
        fullName: "Test Buyer",
        phone: "9800000000",
        address: "123 Test Street",
        city: "Kathmandu",
        paymentMethod: PaymentMethod.COD,
      });
    expect(response.status).toBe(201);

    const groups = await prisma.orderFulfilmentGroup.findMany({
      where: { orderId: response.body.data.id },
      include: { items: { include: { product: { select: { brandId: true } } } } },
    });
    expect(groups).toHaveLength(2);
    for (const group of groups) {
      expect(group.items).toHaveLength(1);
      expect(group.items[0]!.product.brandId).toBe(group.brandId);
    }
  });

  it("cancels every group and marks the order cancelled when the order is cancelled", async () => {
    const { userId: adminId, authHeader } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const { product, size } = await createPurchasableProduct(1000);
    const buyer = await createBuyer();
    const orderId = await checkoutBuyNow(buyer.id, product.id, size.id);

    const cancel = await request(testApp)
      .post(`/api/orders/admin/${orderId}/cancel`)
      .set("Authorization", authHeader)
      .send({ reason: "Test cancellation" });
    expect(cancel.status).toBe(200);

    const groups = await prisma.orderFulfilmentGroup.findMany({ where: { orderId } });
    expect(groups.every((group) => group.status === FulfilmentStatus.CANCELLED)).toBe(true);
    expect(groups.every((group) => group.cancelledAt !== null)).toBe(true);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.fulfilmentSummary).toBe(OrderFulfilmentSummary.CANCELLED);
  });

  it("gives the buyer a per-shipment view of their own order", async () => {
    const { userId: adminId, authHeader } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const { brand, product, size } = await createPurchasableProduct(1000);
    const buyer = await createBuyer();
    const orderId = await checkoutBuyNow(buyer.id, product.id, size.id);
    const group = await prisma.orderFulfilmentGroup.findFirstOrThrow({ where: { orderId } });

    await request(testApp)
      .patch(`/api/orders/admin/${orderId}/fulfilment`)
      .set("Authorization", authHeader)
      .send({ status: FulfilmentStatus.PACKED });
    await request(testApp)
      .patch(`/api/orders/admin/${orderId}/fulfilment`)
      .set("Authorization", authHeader)
      .send({ status: FulfilmentStatus.SHIPPED });

    const response = await request(testApp)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER));

    expect(response.status).toBe(200);
    expect(response.body.data.fulfilmentSummary).toBe(OrderFulfilmentSummary.SHIPPED);
    expect(response.body.data.shipments).toHaveLength(1);
    expect(response.body.data.shipments[0]).toMatchObject({
      id: group.id,
      brandName: brand.name,
      status: FulfilmentStatus.SHIPPED,
    });
    expect(response.body.data.shipments[0].shippedAt).not.toBeNull();
  });

  it("exposes the fulfilment groups and summary on the admin order view", async () => {
    const { userId: adminId, authHeader } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const { brand, product, size } = await createPurchasableProduct(1000);
    const buyer = await createBuyer();
    const orderId = await checkoutBuyNow(buyer.id, product.id, size.id);

    const response = await request(testApp)
      .get(`/api/orders/admin/${orderId}`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data.fulfilmentSummary).toBe(OrderFulfilmentSummary.UNFULFILLED);
    expect(response.body.data.fulfilmentGroups).toHaveLength(1);
    expect(response.body.data.fulfilmentGroups[0]).toMatchObject({
      brandId: brand.id,
      brandName: brand.name,
      status: FulfilmentStatus.PLACED,
    });
    expect(response.body.data.fulfilmentGroups[0].productNames.length).toBeGreaterThan(0);
  });

  it("moves the group and the order summary forward when an admin advances fulfilment", async () => {
    const { userId: adminId, authHeader } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const { product, size } = await createPurchasableProduct(1000);
    const buyer = await createBuyer();
    const orderId = await checkoutBuyNow(buyer.id, product.id, size.id);

    await request(testApp)
      .patch(`/api/orders/admin/${orderId}/fulfilment`)
      .set("Authorization", authHeader)
      .send({ status: FulfilmentStatus.PACKED });
    await request(testApp)
      .patch(`/api/orders/admin/${orderId}/fulfilment`)
      .set("Authorization", authHeader)
      .send({ status: FulfilmentStatus.SHIPPED });

    const group = await prisma.orderFulfilmentGroup.findFirstOrThrow({ where: { orderId } });
    expect(group.status).toBe(FulfilmentStatus.SHIPPED);
    expect(group.shippedAt).not.toBeNull();

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.fulfilmentStatus).toBe(FulfilmentStatus.SHIPPED);
    expect(order.fulfilmentSummary).toBe(OrderFulfilmentSummary.SHIPPED);
  });
});
