import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  BrandPayoutStatus,
  DiscountType,
  FulfilmentStatus,
  OrderFulfilmentSummary,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionStatus,
  PlatformFeeType,
  ProductStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

beforeEach(async () => {
  await redis.flushdb();
});

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
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: 10 },
  });
  return { brand, product, size };
};

const createProductDiscount = (
  productId: string,
  createdById: string,
  overrides: Partial<{
    discountType: DiscountType;
    percentBasisPoints: number | null;
    fixedAmount: number | null;
    startsAt: Date;
    endsAt: Date | null;
  }> = {},
) =>
  prisma.productDiscount.create({
    data: {
      productId,
      createdById,
      discountType: DiscountType.PERCENT,
      percentBasisPoints: 2_000,
      fixedAmount: null,
      startsAt: new Date(Date.now() - 1000),
      endsAt: null,
      ...overrides,
    },
  });

const createActiveCommissionRule = async (adminId: string, ratePercentBasisPoints = 1200) => {
  await prisma.platformCommissionRule.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });
  return prisma.platformCommissionRule.create({
    data: {
      isActive: true,
      updatedById: adminId,
      tiers: {
        create: [
          {
            minPrice: 0,
            maxPrice: null,
            feeType: PlatformFeeType.PERCENT,
            ratePercentBasisPoints,
            sortOrder: 0,
          },
        ],
      },
    },
    include: { tiers: true },
  });
};

const createActiveEsewaGatewayFeeRate = async (adminId: string, ratePercentBasisPoints = 200) => {
  await prisma.gatewayFeeRate.deleteMany({ where: { paymentMethod: PaymentMethod.ESEWA } });
  return prisma.gatewayFeeRate.create({
    data: {
      paymentMethod: PaymentMethod.ESEWA,
      ratePercentBasisPoints,
      isActive: true,
      updatedById: adminId,
    },
  });
};

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
    const { authHeader } = await createAdminSession();
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
