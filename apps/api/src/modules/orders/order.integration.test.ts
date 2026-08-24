import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  BrandPayoutStatus,
  FulfilmentStatus,
  PaymentMethod,
  ProductStatus,
  ProductType,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { testApp } from "#test/integration/testApp.js";

beforeEach(async () => {
  await redis.flushdb();
});

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const authHeaderFor = (userId: string, role: UserRole) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
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
      name: `Checkout Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Checkout Jacket",
      price,
      type: ProductType.TOPS,
      status: ProductStatus.APPROVED,
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: 10 },
  });
  return { brand, product, size };
};

const createActiveCommissionRule = async (adminId: string, ratePercentBasisPoints = 1200) =>
  prisma.platformCommissionRule.create({
    data: { ratePercentBasisPoints, isActive: true, updatedById: adminId },
  });

const createBuyer = async () => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `buyer-${suffix}@outfiqe.test`,
      name: "Test Buyer",
      handle: `test-buyer-${suffix}`,
      phone: `97${suffix.replace(/\D/g, "0").padEnd(8, "0").slice(0, 8)}`,
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });
};

const createOrder = async (userId: string, fulfilmentStatus: FulfilmentStatus = "PLACED") =>
  prisma.order.create({
    data: {
      userId,
      fullName: "Test Buyer",
      phone: "9800000000",
      address: "123 Test Street",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
      fulfilmentStatus,
      subtotal: 1000,
      deliveryFee: 100,
      total: 1100,
    },
  });

describe("PATCH /api/orders/admin/:orderId/fulfilment", () => {
  it("returns 404 for an unknown order id", async () => {
    const { authHeader } = await createAdminSession();

    const response = await request(testApp)
      .patch(`/api/orders/admin/${randomUUID()}/fulfilment`)
      .set("Authorization", authHeader)
      .send({ status: FulfilmentStatus.PACKED });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("NOT_FOUND");
  });

  it("advances a placed order to packed", async () => {
    const { authHeader } = await createAdminSession();
    const buyer = await createBuyer();
    const order = await createOrder(buyer.id);

    const response = await request(testApp)
      .patch(`/api/orders/admin/${order.id}/fulfilment`)
      .set("Authorization", authHeader)
      .send({ status: FulfilmentStatus.PACKED });

    expect(response.status).toBe(200);

    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updated.fulfilmentStatus).toBe(FulfilmentStatus.PACKED);
  });

  it("rejects an invalid transition", async () => {
    const { authHeader } = await createAdminSession();
    const buyer = await createBuyer();
    const order = await createOrder(buyer.id, FulfilmentStatus.PLACED);

    const response = await request(testApp)
      .patch(`/api/orders/admin/${order.id}/fulfilment`)
      .set("Authorization", authHeader)
      .send({ status: FulfilmentStatus.DELIVERED });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("INVALID_TRANSITION");
  });
});

describe("POST /api/orders/checkout — settlement ledger", () => {
  it("creates a BrandPayout snapshot for every line item at checkout", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const { brand, product, size } = await createPurchasableProduct(1000);
    const buyer = await createBuyer();

    const response = await request(testApp)
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

    expect(response.status).toBe(201);

    const payout = await prisma.brandPayout.findFirstOrThrow({
      where: { orderItem: { orderId: response.body.data.id } },
    });
    expect(payout.brandId).toBe(brand.id);
    expect(payout.grossAmount).toBe(1000);
    expect(payout.platformFee).toBe(120);
    expect(payout.netAmount).toBe(880);
    expect(payout.status).toBe(BrandPayoutStatus.PENDING);
  });
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
