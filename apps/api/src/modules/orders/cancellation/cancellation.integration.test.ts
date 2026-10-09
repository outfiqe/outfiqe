import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  BrandPayoutStatus,
  FulfilmentStatus,
  InventoryMovementKind,
  InventoryMovementSource,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/auth-helpers.js";
import {
  authHeaderFor,
  createActiveCommissionRule,
  createActiveEsewaGatewayFeeRate,
  createBuyer,
  createDefaultDeliveryZone,
  createPurchasableProduct,
} from "#test/integration/order-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

beforeEach(async () => {
  await redis.flushdb();
});

describe("POST /api/orders/admin/:orderId/cancel — settlement ledger", () => {
  it("voids the order's PENDING BrandPayout in the cancel transaction", async () => {
    const { userId: adminId, authHeader } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const { product, size } = await createPurchasableProduct(1000);
    const buyer = await createBuyer();

    const checkout = await request(testApp)
      .post("/api/orders/checkout")
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER))
      .send({
        fullName: "Test Buyer",
        phone: "9800000000",
        address: "123 Test Street",
        city: "Kathmandu",
        paymentMethod: PaymentMethod.COD,
        buyNow: { productId: product.id, sizeId: size.id, qty: 1 },
      });
    const orderId = checkout.body.data.id;

    const cancel = await request(testApp)
      .post(`/api/orders/admin/${orderId}/cancel`)
      .set("Authorization", authHeader)
      .send({ reason: "Buyer requested cancellation" });

    expect(cancel.status).toBe(200);

    const payout = await prisma.brandPayout.findFirstOrThrow({
      where: { orderItem: { orderId } },
    });
    expect(payout.status).toBe(BrandPayoutStatus.VOIDED);
    expect(payout.voidedReason).toBe("Buyer requested cancellation");
  });
});

describe("POST /api/orders/:orderId/cancel — buyer self-service", () => {
  const placeOrder = async (adminId: string, buyer: { id: string }) => {
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const { product, size } = await createPurchasableProduct(1000);

    const checkout = await request(testApp)
      .post("/api/orders/checkout")
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER))
      .send({
        fullName: "Test Buyer",
        phone: "9800000000",
        address: "123 Test Street",
        city: "Kathmandu",
        paymentMethod: PaymentMethod.COD,
        buyNow: { productId: product.id, sizeId: size.id, qty: 1 },
      });
    return { orderId: checkout.body.data.id, size };
  };

  it("lets a buyer cancel their own PLACED order, restoring stock and voiding the payout", async () => {
    const { userId: adminId } = await createAdminSession();
    const buyer = await createBuyer();
    const { orderId, size } = await placeOrder(adminId, buyer);

    const response = await request(testApp)
      .post(`/api/orders/${orderId}/cancel`)
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER))
      .send({});

    expect(response.status).toBe(200);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.fulfilmentStatus).toBe(FulfilmentStatus.CANCELLED);

    const restoredSize = await prisma.productSize.findUniqueOrThrow({ where: { id: size.id } });
    expect(restoredSize.stock).toBe(10);

    const payout = await prisma.brandPayout.findFirstOrThrow({ where: { orderItem: { orderId } } });
    expect(payout.status).toBe(BrandPayoutStatus.VOIDED);
    expect(payout.voidedReason).toBe("Cancelled by buyer");
  });

  it("records the sale and its reversal in the inventory ledger against the order", async () => {
    const { userId: adminId } = await createAdminSession();
    const buyer = await createBuyer();
    const { orderId, size } = await placeOrder(adminId, buyer);

    await request(testApp)
      .post(`/api/orders/${orderId}/cancel`)
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER))
      .send({});

    const ledgerEntries = await prisma.inventoryLedgerEntry.findMany({
      where: { sizeId: size.id, sourceType: InventoryMovementSource.ORDER, sourceId: orderId },
      orderBy: { createdAt: "asc" },
    });
    expect(ledgerEntries.map(({ kind, delta }) => ({ kind, delta }))).toEqual([
      { kind: InventoryMovementKind.ORDER_COMMIT, delta: -1 },
      { kind: InventoryMovementKind.ORDER_RESTORE, delta: 1 },
    ]);

    const stockChangedEvents = await prisma.outboxEvent.count({
      where: { topic: OUTBOX_TOPIC.STOCK_CHANGED, aggregateId: orderId },
    });
    expect(stockChangedEvents).toBe(2);
  });

  it("does not credit stock when cancelling a wallet order that never settled", async () => {
    const { userId: adminId } = await createAdminSession();
    const buyer = await createBuyer();
    await createActiveCommissionRule(adminId);
    await prisma.gatewayFeeRate.deleteMany({ where: { paymentMethod: PaymentMethod.ESEWA } });
    await createActiveEsewaGatewayFeeRate(adminId);
    await createDefaultDeliveryZone();
    const { product, size } = await createPurchasableProduct(1000);

    const checkout = await request(testApp)
      .post("/api/orders/checkout")
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER))
      .send({
        fullName: "Test Buyer",
        phone: "9800000000",
        address: "123 Test Street",
        city: "Kathmandu",
        paymentMethod: PaymentMethod.ESEWA,
        buyNow: { productId: product.id, sizeId: size.id, qty: 1 },
      });
    const orderId = checkout.body.data.id;

    const beforeCancel = await prisma.productSize.findUniqueOrThrow({ where: { id: size.id } });
    expect(beforeCancel.stock).toBe(10);

    const response = await request(testApp)
      .post(`/api/orders/${orderId}/cancel`)
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER))
      .send({});

    expect(response.status).toBe(200);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.fulfilmentStatus).toBe(FulfilmentStatus.CANCELLED);
    expect(order.paymentStatus).toBe(PaymentStatus.FAILED);

    const pendingTransactions = await prisma.paymentTransaction.count({
      where: { orderId, status: PaymentTransactionStatus.INITIATED },
    });
    expect(pendingTransactions).toBe(0);

    const afterCancel = await prisma.productSize.findUniqueOrThrow({ where: { id: size.id } });
    expect(afterCancel.stock).toBe(10);

    const retry = await request(testApp)
      .post(`/api/payments/${orderId}/initiate`)
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER));
    expect(retry.status).toBe(409);
    expect(retry.body.code).toBe("ORDER_CANCELLED");
  });

  it("404s when cancelling someone else's order", async () => {
    const { userId: adminId } = await createAdminSession();
    const buyer = await createBuyer();
    const otherBuyer = await createBuyer();
    const { orderId } = await placeOrder(adminId, buyer);

    const response = await request(testApp)
      .post(`/api/orders/${orderId}/cancel`)
      .set("Authorization", authHeaderFor(otherBuyer.id, UserRole.CUSTOMER))
      .send({});

    expect(response.status).toBe(404);
  });

  it("rejects cancelling an order that has already shipped", async () => {
    const { userId: adminId, authHeader } = await createAdminSession();
    const buyer = await createBuyer();
    const { orderId } = await placeOrder(adminId, buyer);

    await request(testApp)
      .patch(`/api/orders/admin/${orderId}/fulfilment`)
      .set("Authorization", authHeader)
      .send({ status: FulfilmentStatus.PACKED });
    await request(testApp)
      .patch(`/api/orders/admin/${orderId}/fulfilment`)
      .set("Authorization", authHeader)
      .send({ status: FulfilmentStatus.SHIPPED });

    const response = await request(testApp)
      .post(`/api/orders/${orderId}/cancel`)
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER))
      .send({});

    expect(response.status).toBe(409);
  });
});
