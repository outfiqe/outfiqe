import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  BrandPayoutStatus,
  DiscountType,
  PaymentMethod,
  UserRole,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession, grantPlatformPermissions } from "#test/integration/auth-helpers.js";
import {
  authHeaderFor,
  createActiveCommissionRule,
  createActiveEsewaGatewayFeeRate,
  createBuyer,
  createDefaultDeliveryZone,
  createProductDiscount,
  createPurchasableProduct,
  createUserWithRole,
} from "#test/integration/order-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

beforeEach(async () => {
  await redis.flushdb();
});

describe("POST /api/orders/checkout — buyer role gate", () => {
  const checkoutBody = (productId: string, sizeId: string) => ({
    fullName: "Test Buyer",
    phone: "9800000000",
    address: "123 Test Street",
    city: "Kathmandu",
    paymentMethod: PaymentMethod.COD,
    buyNow: { productId, sizeId, qty: 1 },
  });

  it("lets a CUSTOMER check out", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const { product, size } = await createPurchasableProduct(1000);
    const buyer = await createBuyer();

    const response = await request(testApp)
      .post("/api/orders/checkout")
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER))
      .send(checkoutBody(product.id, size.id));

    expect(response.status).toBe(201);
  });

  it("rejects a BRAND_OWNER with 403", async () => {
    await createDefaultDeliveryZone();
    const { product, size } = await createPurchasableProduct(1000);
    const owner = await createUserWithRole(UserRole.BRAND_OWNER);

    const response = await request(testApp)
      .post("/api/orders/checkout")
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send(checkoutBody(product.id, size.id));

    expect(response.status).toBe(403);
  });

  it("rejects an ADMIN with 403", async () => {
    await createDefaultDeliveryZone();
    const { product, size } = await createPurchasableProduct(1000);
    const admin = await createUserWithRole(UserRole.ADMIN);

    const response = await request(testApp)
      .post("/api/orders/checkout")
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN))
      .send(checkoutBody(product.id, size.id));

    expect(response.status).toBe(403);
  });

  it("rejects a BRAND_OWNER from the buyer order list with 403", async () => {
    const owner = await createUserWithRole(UserRole.BRAND_OWNER);

    const response = await request(testApp)
      .get("/api/orders")
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER));

    expect(response.status).toBe(403);
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

  it("records the gateway fee estimate for a non-COD payment method but never deducts it from the brand's payout", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createActiveEsewaGatewayFeeRate(adminId);
    await createDefaultDeliveryZone();
    const { product, size } = await createPurchasableProduct(1000);
    const buyer = await createBuyer();

    const response = await request(testApp)
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

    expect(response.status).toBe(201);

    const payout = await prisma.brandPayout.findFirstOrThrow({
      where: { orderItem: { orderId: response.body.data.id } },
    });
    expect(payout.platformFee).toBe(120);
    expect(payout.gatewayFee).toBe(20);
    expect(payout.netAmount).toBe(880);
  });

  it("zeroes the platform fee for an exempt brand; the gateway fee is still recorded but never deducted from the payout", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createActiveEsewaGatewayFeeRate(adminId);
    await createDefaultDeliveryZone();
    const { brand, product, size } = await createPurchasableProduct(1000);
    await prisma.brandCommissionExemption.create({
      data: {
        brandId: brand.id,
        startsAt: new Date(Date.now() - 1000),
        endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        reason: "Launch cohort",
        createdById: adminId,
      },
    });
    const buyer = await createBuyer();

    const response = await request(testApp)
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

    expect(response.status).toBe(201);

    const payout = await prisma.brandPayout.findFirstOrThrow({
      where: { orderItem: { orderId: response.body.data.id } },
    });
    expect(payout.platformFee).toBe(0);
    expect(payout.platformCommissionTierId).toBeNull();
    expect(payout.gatewayFee).toBe(20);
    expect(payout.netAmount).toBe(1000);
  });

  it("charges the normal commission once a brand's exemption has expired", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const { brand, product, size } = await createPurchasableProduct(1000);
    await prisma.brandCommissionExemption.create({
      data: {
        brandId: brand.id,
        startsAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        endsAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        reason: "Launch cohort, already over",
        createdById: adminId,
      },
    });
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
    expect(payout.platformFee).toBe(120);
    expect(payout.platformCommissionTierId).not.toBeNull();
  });

  it("applies the correct band of a multi-tier ladder based on the item's price", async () => {
    const { authHeader, userId } = await createAdminSession();
    await grantPlatformPermissions(userId, "platform:commissions:manage");
    await request(testApp)
      .post("/api/brand-payouts/commission-rules")
      .set("Authorization", authHeader)
      .send({
        tiers: [
          { minPrice: 0, maxPrice: 1_000, feeType: "FLAT", flatAmount: 30 },
          { minPrice: 1_000, maxPrice: null, feeType: "PERCENT", ratePercent: 5 },
        ],
      });
    await createDefaultDeliveryZone();
    const { product, size } = await createPurchasableProduct(1_500);
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
    expect(payout.platformFee).toBe(75);
  });
});

describe("POST /api/orders/checkout — brand-funded discounts", () => {
  it("computes the BrandPayout from the discounted price, identical to a full-price sale at that price", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId, 1_000);
    await createDefaultDeliveryZone();
    const { brand, product, size } = await createPurchasableProduct(2_000);
    await createProductDiscount(product.id, adminId, {
      discountType: DiscountType.PERCENT,
      percentBasisPoints: 2_000,
    });
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

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: response.body.data.id },
      include: { items: true },
    });
    expect(order.subtotal).toBe(1_600);

    const orderItem = order.items[0];
    expect(orderItem?.unitPrice).toBe(1_600);
    expect(orderItem?.listUnitPrice).toBe(2_000);
    expect(orderItem?.brandDiscountAmount).toBe(400);

    const payout = await prisma.brandPayout.findFirstOrThrow({
      where: { orderItem: { orderId: order.id } },
    });
    expect(payout.brandId).toBe(brand.id);
    expect(payout.grossAmount).toBe(1_600);
    expect(payout.platformFee).toBe(160);
    expect(payout.netAmount).toBe(1_440);
  });

  it("never applies a discount that hasn't started yet", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId, 1_000);
    await createDefaultDeliveryZone();
    const { product, size } = await createPurchasableProduct(2_000);
    await createProductDiscount(product.id, adminId, {
      startsAt: new Date(Date.now() + 1000 * 60 * 60),
    });
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
    const orderItem = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: response.body.data.id },
    });
    expect(orderItem.unitPrice).toBe(2_000);
    expect(orderItem.brandDiscountAmount).toBe(0);
  });

  it("never applies a discount that has already ended", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId, 1_000);
    await createDefaultDeliveryZone();
    const { product, size } = await createPurchasableProduct(2_000);
    await createProductDiscount(product.id, adminId, {
      startsAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      endsAt: new Date(Date.now() - 1000 * 60 * 60),
    });
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
    const orderItem = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: response.body.data.id },
    });
    expect(orderItem.unitPrice).toBe(2_000);
  });

  it("never retroactively changes an already-placed order when a discount is created afterwards", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId, 1_000);
    await createDefaultDeliveryZone();
    const { product, size } = await createPurchasableProduct(2_000);
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

    await createProductDiscount(product.id, adminId);

    const orderItem = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: response.body.data.id },
    });
    expect(orderItem.unitPrice).toBe(2_000);
    expect(orderItem.brandDiscountAmount).toBe(0);
  });

  it("resolves overlapping active discounts to the most recently created one", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId, 1_000);
    await createDefaultDeliveryZone();
    const { product, size } = await createPurchasableProduct(2_000);
    await createProductDiscount(product.id, adminId, { percentBasisPoints: 1_000 });
    await createProductDiscount(product.id, adminId, { percentBasisPoints: 2_500 });
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
    const orderItem = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: response.body.data.id },
    });
    expect(orderItem.unitPrice).toBe(1_500);
  });
});
