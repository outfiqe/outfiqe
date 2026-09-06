import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CouponType, PaymentMethod, ProductStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.CUSTOMER });
  return `Bearer ${accessToken}`;
};

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

const createDefaultDeliveryZone = () =>
  prisma.deliveryZone.create({
    data: {
      name: "Default Zone",
      isDefault: true,
      standardDeliveryFee: 100,
      freeDeliveryThreshold: 100_000,
      codHandlingFee: 0,
    },
  });

const createActiveCommissionRule = async (adminId: string, ratePercentBasisPoints = 1_000) =>
  prisma.platformCommissionRule.create({
    data: {
      isActive: true,
      updatedById: adminId,
      tiers: {
        create: [
          {
            minPrice: 0,
            maxPrice: null,
            feeType: "PERCENT",
            ratePercentBasisPoints,
            sortOrder: 0,
          },
        ],
      },
    },
  });

const createPurchasableProduct = async (price: number, stock = 10) => {
  const brand = await prisma.brand.create({
    data: {
      name: `Coupon Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Coupon Jacket",
      price,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock },
  });
  return { brand, product, size };
};

const createCoupon = (overrides: {
  createdById: string;
  code?: string;
  type?: CouponType;
  fixedAmount?: number;
  percentBasisPoints?: number;
  maxDiscountAmount?: number;
  minSubtotal?: number;
  totalBudgetAmount?: number;
  prepaidOnly?: boolean;
  stacksWithBrandDiscount?: boolean;
}) =>
  prisma.coupon.create({
    data: {
      code: `TEST${randomUUID().slice(0, 6).toUpperCase()}`,
      type: CouponType.FIXED,
      fixedAmount: 400,
      startsAt: new Date(Date.now() - 1000),
      ...overrides,
    },
  });

const BUDGET_ABOVE_THRESHOLD = 60_000;
const BUDGET_BELOW_THRESHOLD = 10_000;

describe("POST /api/admin/coupons", () => {
  it("creates a coupon", async () => {
    const { authHeader } = await createAdminSession();

    const response = await request(testApp)
      .post("/api/admin/coupons")
      .set("Authorization", authHeader)
      .send({
        code: "welcome300",
        type: "FIXED",
        fixedAmount: 300,
        startsAt: new Date().toISOString(),
      });

    expect(response.status).toBe(201);
    expect(response.body.data.code).toBe("WELCOME300");
    expect(response.body.data.fixedAmount).toBe(300);
    expect(response.body.data.status).toBe("ACTIVE");
  });

  it("rejects a duplicate code", async () => {
    const { authHeader, userId } = await createAdminSession();
    await createCoupon({ code: "DUPE1", createdById: userId });

    const response = await request(testApp)
      .post("/api/admin/coupons")
      .set("Authorization", authHeader)
      .send({ code: "dupe1", type: "FIXED", fixedAmount: 100, startsAt: new Date().toISOString() });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("COUPON_CODE_ALREADY_EXISTS");
  });

  it("starts paused and pending approval once the budget exceeds the approval threshold", async () => {
    const { authHeader } = await createAdminSession();

    const response = await request(testApp)
      .post("/api/admin/coupons")
      .set("Authorization", authHeader)
      .send({
        code: "bigbudget",
        type: "FIXED",
        fixedAmount: 300,
        startsAt: new Date().toISOString(),
        totalBudgetAmount: BUDGET_ABOVE_THRESHOLD,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe("PAUSED");
    expect(response.body.data.requiresApproval).toBe(true);
    expect(response.body.data.approvedById).toBeNull();
  });

  it("goes straight to active when the budget is under the approval threshold", async () => {
    const { authHeader } = await createAdminSession();

    const response = await request(testApp)
      .post("/api/admin/coupons")
      .set("Authorization", authHeader)
      .send({
        code: "smallbudget",
        type: "FIXED",
        fixedAmount: 300,
        startsAt: new Date().toISOString(),
        totalBudgetAmount: BUDGET_BELOW_THRESHOLD,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe("ACTIVE");
    expect(response.body.data.requiresApproval).toBe(false);
  });
});

describe("PATCH /api/admin/coupons/:id/approve", () => {
  it("refuses activation before approval", async () => {
    const { authHeader, userId } = await createAdminSession();
    const coupon = await createCoupon({
      createdById: userId,
      totalBudgetAmount: BUDGET_ABOVE_THRESHOLD,
    });
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { status: "PAUSED", requiresApproval: true },
    });

    const response = await request(testApp)
      .patch(`/api/admin/coupons/${coupon.id}/status`)
      .set("Authorization", authHeader)
      .send({ status: "ACTIVE" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("COUPON_APPROVAL_REQUIRED");
  });

  it("refuses a same-admin sign-off", async () => {
    const { authHeader, userId } = await createAdminSession();
    const coupon = await createCoupon({
      createdById: userId,
      totalBudgetAmount: BUDGET_ABOVE_THRESHOLD,
    });
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { status: "PAUSED", requiresApproval: true },
    });

    const response = await request(testApp)
      .patch(`/api/admin/coupons/${coupon.id}/approve`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("SAME_ADMIN_SIGN_OFF");
  });

  it("activates the coupon once a different admin approves", async () => {
    const { userId: creatorId } = await createAdminSession();
    const { authHeader: approverAuthHeader, userId: approverId } = await createAdminSession();
    const coupon = await createCoupon({
      createdById: creatorId,
      totalBudgetAmount: BUDGET_ABOVE_THRESHOLD,
    });
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { status: "PAUSED", requiresApproval: true },
    });

    const response = await request(testApp)
      .patch(`/api/admin/coupons/${coupon.id}/approve`)
      .set("Authorization", approverAuthHeader);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ACTIVE");
    expect(response.body.data.approvedById).toBe(approverId);
    expect(response.body.data.approvedAt).not.toBeNull();
  });
});

describe("PATCH /api/admin/coupons/:id/budget", () => {
  it("re-requires approval when a budget raise crosses the threshold", async () => {
    const { authHeader, userId } = await createAdminSession();
    const coupon = await createCoupon({
      createdById: userId,
      totalBudgetAmount: BUDGET_BELOW_THRESHOLD,
    });

    const response = await request(testApp)
      .patch(`/api/admin/coupons/${coupon.id}/budget`)
      .set("Authorization", authHeader)
      .send({ totalBudgetAmount: BUDGET_ABOVE_THRESHOLD, maxRedemptions: null });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("PAUSED");
    expect(response.body.data.requiresApproval).toBe(true);
    expect(response.body.data.approvedById).toBeNull();
  });

  it("doesn't require re-approval for a raise that stays under the threshold", async () => {
    const { authHeader, userId } = await createAdminSession();
    const coupon = await createCoupon({
      createdById: userId,
      totalBudgetAmount: 5_000,
    });

    const response = await request(testApp)
      .patch(`/api/admin/coupons/${coupon.id}/budget`)
      .set("Authorization", authHeader)
      .send({ totalBudgetAmount: BUDGET_BELOW_THRESHOLD, maxRedemptions: null });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ACTIVE");
    expect(response.body.data.requiresApproval).toBe(false);
  });
});

describe("GET /api/admin/coupons", () => {
  it("filters the list by status", async () => {
    const { authHeader, userId } = await createAdminSession();
    await createCoupon({ createdById: userId });
    const paused = await createCoupon({ createdById: userId });
    await prisma.coupon.update({ where: { id: paused.id }, data: { status: "PAUSED" } });

    const response = await request(testApp)
      .get("/api/admin/coupons?status=PAUSED")
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data.coupons.every((c: { status: string }) => c.status === "PAUSED")).toBe(
      true,
    );
  });
});

describe("PATCH /api/admin/coupons/:id/status", () => {
  it("pauses an active coupon", async () => {
    const { authHeader, userId } = await createAdminSession();
    const coupon = await createCoupon({ createdById: userId });

    const response = await request(testApp)
      .patch(`/api/admin/coupons/${coupon.id}/status`)
      .set("Authorization", authHeader)
      .send({ status: "PAUSED" });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("PAUSED");
  });
});

describe("POST /api/cart/coupon", () => {
  it("applies a valid coupon and repriced the cart", async () => {
    await createDefaultDeliveryZone();
    const buyer = await createBuyer();
    const { userId: adminId } = await createAdminSession();
    const { product, size } = await createPurchasableProduct(2_000);
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 400 });

    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: product.id, sizeId: size.id, qty: 1 });

    const response = await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code });

    expect(response.status).toBe(200);
    expect(response.body.data.appliedCoupon.code).toBe(coupon.code);
    expect(response.body.data.appliedCoupon.discountAmount).toBe(400);
    expect(response.body.data.platformDiscountTotal).toBe(400);
    expect(response.body.data.total).toBe(2_000 - 400 + 100);
  });

  it("refuses an unknown code", async () => {
    const buyer = await createBuyer();

    const response = await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: "NOPE1234" });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("COUPON_NOT_FOUND");
  });

  it("removes an applied coupon", async () => {
    await createDefaultDeliveryZone();
    const buyer = await createBuyer();
    const { userId: adminId } = await createAdminSession();
    const { product, size } = await createPurchasableProduct(2_000);
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 400 });

    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: product.id, sizeId: size.id, qty: 1 });
    await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code });

    const response = await request(testApp)
      .delete("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.appliedCoupon).toBeNull();
    expect(response.body.data.total).toBe(2_000 + 100);
  });
});

describe("POST /api/orders/checkout — coupon redemption", () => {
  it("charges the customer less while paying the brand exactly as though the order were full price", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId, 1_000);
    await createDefaultDeliveryZone();
    const { brand, product, size } = await createPurchasableProduct(2_000);
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 400 });
    const buyer = await createBuyer();

    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: product.id, sizeId: size.id, qty: 1 });
    await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code });

    const checkoutResponse = await request(testApp)
      .post("/api/orders/checkout")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({
        fullName: "Test Buyer",
        phone: "9800000000",
        address: "123 Test Street",
        city: "Kathmandu",
        paymentMethod: PaymentMethod.COD,
      });

    expect(checkoutResponse.status).toBe(201);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: checkoutResponse.body.data.id },
      include: { items: true },
    });
    expect(order.subtotal).toBe(2_000);
    expect(order.platformDiscountTotal).toBe(400);
    expect(order.total).toBe(2_000 - 400 + 100);

    const orderItem = order.items[0];
    expect(orderItem?.unitPrice).toBe(2_000);
    expect(orderItem?.platformDiscountAmount).toBe(400);

    const payout = await prisma.brandPayout.findFirstOrThrow({
      where: { orderItem: { orderId: order.id } },
    });
    expect(payout.brandId).toBe(brand.id);
    expect(payout.grossAmount).toBe(2_000);
    expect(payout.platformFee).toBe(200);
    expect(payout.netAmount).toBe(1_800);

    const redemption = await prisma.couponRedemption.findUniqueOrThrow({
      where: { orderId: order.id },
    });
    expect(redemption.couponId).toBe(coupon.id);
    expect(redemption.platformFundedAmount).toBe(400);

    const updatedCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
    expect(updatedCoupon.spentAmount).toBe(400);
    expect(updatedCoupon.redemptionCount).toBe(1);
  });

  it("refuses to apply a coupon to a second cart once the user has already redeemed it", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 200 });
    const buyer = await createBuyer();

    const applyAndCheckout = async () => {
      const { product, size } = await createPurchasableProduct(2_000);
      await request(testApp)
        .post("/api/cart/items")
        .set("Authorization", authHeaderFor(buyer.id))
        .send({ productId: product.id, sizeId: size.id, qty: 1 });
      const apply = await request(testApp)
        .post("/api/cart/coupon")
        .set("Authorization", authHeaderFor(buyer.id))
        .send({ code: coupon.code });
      const checkout = await request(testApp)
        .post("/api/orders/checkout")
        .set("Authorization", authHeaderFor(buyer.id))
        .send({
          fullName: "Test Buyer",
          phone: "9800000000",
          address: "123 Test Street",
          city: "Kathmandu",
          paymentMethod: PaymentMethod.COD,
        });
      return { apply, checkout };
    };

    const first = await applyAndCheckout();
    expect(first.apply.status).toBe(200);
    expect(first.checkout.status).toBe(201);

    const second = await applyAndCheckout();
    expect(second.apply.status).toBe(409);
    expect(second.apply.body.code).toBe("COUPON_ALREADY_USED");
    expect(second.checkout.status).toBe(201);
  });

  it("holds under a race: two concurrent first-time checkouts by the same user produce exactly one success", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 200 });
    const buyer = await createBuyer();
    const { product, size } = await createPurchasableProduct(2_000, 2);

    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: product.id, sizeId: size.id, qty: 1 });
    await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code });

    const checkoutRequest = () =>
      request(testApp)
        .post("/api/orders/checkout")
        .set("Authorization", authHeaderFor(buyer.id))
        .send({
          fullName: "Test Buyer",
          phone: "9800000000",
          address: "123 Test Street",
          city: "Kathmandu",
          paymentMethod: PaymentMethod.COD,
        });

    const [first, second] = await Promise.all([checkoutRequest(), checkoutRequest()]);
    const statuses = [first.status, second.status].sort();
    expect(statuses[0]).toBeLessThan(300);
    expect(statuses[1]).toBeGreaterThanOrEqual(400);

    const updatedCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
    expect(updatedCoupon.redemptionCount).toBe(1);
    expect(updatedCoupon.spentAmount).toBe(200);
  });

  it("refuses a coupon below its minimum subtotal", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const { product, size } = await createPurchasableProduct(500);
    const coupon = await createCoupon({
      createdById: adminId,
      fixedAmount: 100,
      minSubtotal: 3_000,
    });
    const buyer = await createBuyer();

    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: product.id, sizeId: size.id, qty: 1 });

    const response = await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("COUPON_MIN_SUBTOTAL_NOT_MET");
  });

  it("stops redeeming once the total budget is exhausted", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({
      createdById: adminId,
      fixedAmount: 300,
      totalBudgetAmount: 300,
    });

    const firstBuyer = await createBuyer();
    const { product: firstProduct, size: firstSize } = await createPurchasableProduct(2_000);
    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(firstBuyer.id))
      .send({ productId: firstProduct.id, sizeId: firstSize.id, qty: 1 });
    await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(firstBuyer.id))
      .send({ code: coupon.code });
    const firstCheckout = await request(testApp)
      .post("/api/orders/checkout")
      .set("Authorization", authHeaderFor(firstBuyer.id))
      .send({
        fullName: "Buyer One",
        phone: "9800000001",
        address: "123 Test Street",
        city: "Kathmandu",
        paymentMethod: PaymentMethod.COD,
      });
    expect(firstCheckout.status).toBe(201);

    const exhaustedCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
    expect(exhaustedCoupon.status).toBe("PAUSED");

    const secondBuyer = await createBuyer();
    const { product: secondProduct, size: secondSize } = await createPurchasableProduct(2_000);
    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(secondBuyer.id))
      .send({ productId: secondProduct.id, sizeId: secondSize.id, qty: 1 });
    const secondApply = await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(secondBuyer.id))
      .send({ code: coupon.code });

    expect(secondApply.status).toBe(400);
    expect(secondApply.body.code).toBe("COUPON_NOT_ACTIVE");
  });

  it("releases the coupon back when the order is cancelled", async () => {
    const { authHeader: adminAuthHeader, userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 200 });
    const buyer = await createBuyer();
    const { product, size } = await createPurchasableProduct(2_000);

    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: product.id, sizeId: size.id, qty: 1 });
    await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code });
    const checkout = await request(testApp)
      .post("/api/orders/checkout")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({
        fullName: "Test Buyer",
        phone: "9800000000",
        address: "123 Test Street",
        city: "Kathmandu",
        paymentMethod: PaymentMethod.COD,
      });
    expect(checkout.status).toBe(201);

    const cancelResponse = await request(testApp)
      .post(`/api/orders/admin/${checkout.body.data.id}/cancel`)
      .set("Authorization", adminAuthHeader)
      .send({ reason: "Out of stock" });
    expect(cancelResponse.status).toBe(200);

    const redemption = await prisma.couponRedemption.findUniqueOrThrow({
      where: { orderId: checkout.body.data.id },
    });
    expect(redemption.status).toBe("RELEASED");

    const updatedCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
    expect(updatedCoupon.spentAmount).toBe(0);
    expect(updatedCoupon.redemptionCount).toBe(0);

    const readdItem = await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: product.id, sizeId: size.id, qty: 1 });
    expect(readdItem.status).toBe(200);
    const reapply = await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code });
    expect(reapply.status).toBe(200);
  });

  it("holds under concurrent load: N parallel checkouts on a budget for N-1 produce exactly N-1 successes", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const REDEMPTION_AMOUNT = 100;
    const BUDGET_UNITS = 4;
    const PARTICIPANT_COUNT = 5;
    const coupon = await createCoupon({
      createdById: adminId,
      fixedAmount: REDEMPTION_AMOUNT,
      totalBudgetAmount: REDEMPTION_AMOUNT * BUDGET_UNITS,
    });

    const participants = await Promise.all(
      Array.from({ length: PARTICIPANT_COUNT }, async () => {
        const buyer = await createBuyer();
        const { product, size } = await createPurchasableProduct(2_000);
        await request(testApp)
          .post("/api/cart/items")
          .set("Authorization", authHeaderFor(buyer.id))
          .send({ productId: product.id, sizeId: size.id, qty: 1 });
        await request(testApp)
          .post("/api/cart/coupon")
          .set("Authorization", authHeaderFor(buyer.id))
          .send({ code: coupon.code });
        return buyer;
      }),
    );

    const results = await Promise.all(
      participants.map((buyer) =>
        request(testApp)
          .post("/api/orders/checkout")
          .set("Authorization", authHeaderFor(buyer.id))
          .send({
            fullName: "Test Buyer",
            phone: "9800000000",
            address: "123 Test Street",
            city: "Kathmandu",
            paymentMethod: PaymentMethod.COD,
          }),
      ),
    );

    const successCount = results.filter((response) => response.status === 201).length;
    expect(successCount).toBe(BUDGET_UNITS);

    const updatedCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
    expect(updatedCoupon.spentAmount).toBe(REDEMPTION_AMOUNT * BUDGET_UNITS);
    expect(updatedCoupon.redemptionCount).toBe(BUDGET_UNITS);
  });
});

const checkoutOnceWithCoupon = async (couponCode: string, price: number) => {
  const buyer = await createBuyer();
  const { product, size } = await createPurchasableProduct(price);
  await request(testApp)
    .post("/api/cart/items")
    .set("Authorization", authHeaderFor(buyer.id))
    .send({ productId: product.id, sizeId: size.id, qty: 1 });
  await request(testApp)
    .post("/api/cart/coupon")
    .set("Authorization", authHeaderFor(buyer.id))
    .send({ code: couponCode });
  const checkout = await request(testApp)
    .post("/api/orders/checkout")
    .set("Authorization", authHeaderFor(buyer.id))
    .send({
      fullName: "Test Buyer",
      phone: "9800000000",
      address: "123 Test Street",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
    });
  return { buyer, checkout };
};

describe("Coupon budget alerts and auto-pause", () => {
  it("tracks the highest crossed threshold without pausing before 100%", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({
      createdById: adminId,
      fixedAmount: 500,
      totalBudgetAmount: 1_000,
    });

    const { checkout } = await checkoutOnceWithCoupon(coupon.code, 2_000);
    expect(checkout.status).toBe(201);

    const updatedCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
    expect(updatedCoupon.lastAlertedBudgetThreshold).toBe(50);
    expect(updatedCoupon.status).toBe("ACTIVE");
  });

  it("auto-pauses once spend reaches the full budget", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({
      createdById: adminId,
      fixedAmount: 500,
      totalBudgetAmount: 1_000,
    });

    await checkoutOnceWithCoupon(coupon.code, 2_000);
    const { checkout: secondCheckout } = await checkoutOnceWithCoupon(coupon.code, 2_000);
    expect(secondCheckout.status).toBe(201);

    const updatedCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
    expect(updatedCoupon.lastAlertedBudgetThreshold).toBe(100);
    expect(updatedCoupon.status).toBe("PAUSED");
  });
});

describe("GET /api/admin/coupons/:id/performance", () => {
  it("reports zeroed metrics for a coupon with no redemptions", async () => {
    const { authHeader, userId } = await createAdminSession();
    const coupon = await createCoupon({ createdById: userId });

    const response = await request(testApp)
      .get(`/api/admin/coupons/${coupon.id}/performance`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      redemptionCount: 0,
      totalDiscountAmount: 0,
      totalGmv: 0,
      netMargin: 0,
    });
  });

  it("aggregates GMV, spend, and commission across redemptions", async () => {
    const { authHeader, userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId, 1_000);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 500 });

    await checkoutOnceWithCoupon(coupon.code, 2_000);
    await checkoutOnceWithCoupon(coupon.code, 2_000);

    const response = await request(testApp)
      .get(`/api/admin/coupons/${coupon.id}/performance`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      redemptionCount: 2,
      totalDiscountAmount: 1_000,
      totalPlatformFundedAmount: 1_000,
      totalGmv: 4_000,
      totalPlatformFeeCollected: 400,
      netMargin: -600,
      newCustomerCount: 2,
      returningCustomerCount: 0,
    });
  });
});

describe("GET /api/admin/coupons/redemptions", () => {
  it("finds a redemption by coupon code and by order id", async () => {
    const { authHeader, userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 300 });

    const { checkout } = await checkoutOnceWithCoupon(coupon.code, 2_000);
    expect(checkout.status).toBe(201);

    const byCode = await request(testApp)
      .get(`/api/admin/coupons/redemptions?code=${coupon.code}`)
      .set("Authorization", authHeader);
    expect(byCode.status).toBe(200);
    expect(byCode.body.data.redemptions).toHaveLength(1);
    expect(byCode.body.data.redemptions[0].couponCode).toBe(coupon.code);

    const byOrder = await request(testApp)
      .get(`/api/admin/coupons/redemptions?orderId=${checkout.body.data.id}`)
      .set("Authorization", authHeader);
    expect(byOrder.status).toBe(200);
    expect(byOrder.body.data.redemptions).toHaveLength(1);
    expect(byOrder.body.data.redemptions[0].orderId).toBe(checkout.body.data.id);
  });
});

const checkoutRequest = (buyer: { id: string }, overrides: Record<string, unknown> = {}) =>
  request(testApp)
    .post("/api/orders/checkout")
    .set("Authorization", authHeaderFor(buyer.id))
    .send({
      fullName: "Test Buyer",
      phone: "9800000000",
      address: "123 Test Street",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
      ...overrides,
    });

describe("Cancellation release-vs-consume policy", () => {
  it("keeps a coupon consumed when the customer cancels their own order", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 200 });
    const buyer = await createBuyer();
    const { product, size } = await createPurchasableProduct(2_000);

    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: product.id, sizeId: size.id, qty: 1 });
    await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code });
    const checkout = await checkoutRequest(buyer);
    expect(checkout.status).toBe(201);

    const cancelResponse = await request(testApp)
      .post(`/api/orders/${checkout.body.data.id}/cancel`)
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ reason: "Changed my mind" });
    expect(cancelResponse.status).toBe(200);

    const redemption = await prisma.couponRedemption.findUniqueOrThrow({
      where: { orderId: checkout.body.data.id },
    });
    expect(redemption.status).toBe("CONSUMED");

    const updatedCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
    expect(updatedCoupon.spentAmount).toBe(200);
    expect(updatedCoupon.redemptionCount).toBe(1);

    const reapply = await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code });
    expect(reapply.status).toBe(409);
    expect(reapply.body.code).toBe("COUPON_ALREADY_USED");
  });
});

describe("Rate limiting POST /api/cart/coupon", () => {
  it("blocks after too many attempts by the same user", async () => {
    const buyer = await createBuyer();
    const ATTEMPTS_BEFORE_LIMIT = 10;

    for (let attempt = 0; attempt < ATTEMPTS_BEFORE_LIMIT; attempt += 1) {
      const response = await request(testApp)
        .post("/api/cart/coupon")
        .set("Authorization", authHeaderFor(buyer.id))
        .send({ code: "NOPE1234" });
      expect(response.status).toBe(404);
    }

    const blocked = await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: "NOPE1234" });
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("RATE_LIMITED");
  });
});

describe("Redemption velocity flagging", () => {
  it("flags a redemption once enough others share the same delivery contact", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 100 });
    const sharedPhone = "9811111111";
    const sharedAddress = "1 Farm Lane";

    const redeemOnce = async () => {
      const buyer = await createBuyer();
      const { product, size } = await createPurchasableProduct(2_000);
      await request(testApp)
        .post("/api/cart/items")
        .set("Authorization", authHeaderFor(buyer.id))
        .send({ productId: product.id, sizeId: size.id, qty: 1 });
      await request(testApp)
        .post("/api/cart/coupon")
        .set("Authorization", authHeaderFor(buyer.id))
        .send({ code: coupon.code });
      return checkoutRequest(buyer, { phone: sharedPhone, address: sharedAddress });
    };

    const first = await redeemOnce();
    const second = await redeemOnce();
    const third = await redeemOnce();
    const fourth = await redeemOnce();
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(third.status).toBe(201);
    expect(fourth.status).toBe(201);

    const fourthRedemption = await prisma.couponRedemption.findUniqueOrThrow({
      where: { orderId: fourth.body.data.id },
    });
    expect(fourthRedemption.flaggedForReview).toBe(true);
    expect(fourthRedemption.flagReason).toMatch(/other coupon redemptions/);

    const firstRedemption = await prisma.couponRedemption.findUniqueOrThrow({
      where: { orderId: first.body.data.id },
    });
    expect(firstRedemption.flaggedForReview).toBe(false);
  });
});

describe("Edge cases — revalidation between cart and checkout", () => {
  it("refuses at checkout when the coupon expired after it was applied", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 200 });
    const buyer = await createBuyer();
    const { product, size } = await createPurchasableProduct(2_000);

    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: product.id, sizeId: size.id, qty: 1 });
    await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code });

    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { endsAt: new Date(Date.now() - 1000) },
    });

    const checkout = await checkoutRequest(buyer);
    expect(checkout.status).toBe(400);
    expect(checkout.body.code).toBe("COUPON_NOT_ACTIVE");
  });

  it("refuses at checkout when the coupon was paused after it was applied", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 200 });
    const buyer = await createBuyer();
    const { product, size } = await createPurchasableProduct(2_000);

    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: product.id, sizeId: size.id, qty: 1 });
    await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code });

    await prisma.coupon.update({ where: { id: coupon.id }, data: { status: "PAUSED" } });

    const checkout = await checkoutRequest(buyer);
    expect(checkout.status).toBe(400);
    expect(checkout.body.code).toBe("COUPON_NOT_ACTIVE");
  });

  it("never consumes budget when stock runs out after the coupon is applied", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 200 });
    const buyer = await createBuyer();
    const { product, size } = await createPurchasableProduct(2_000, 1);

    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: product.id, sizeId: size.id, qty: 1 });
    await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code });

    await prisma.productSize.update({ where: { id: size.id }, data: { stock: 0 } });

    const checkout = await checkoutRequest(buyer);
    expect(checkout.status).toBe(409);

    const updatedCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
    expect(updatedCoupon.spentAmount).toBe(0);
    expect(updatedCoupon.redemptionCount).toBe(0);
  });

  it("recomputes a percent coupon's discount after an eligible item is removed", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({
      createdById: adminId,
      type: CouponType.PERCENT,
      percentBasisPoints: 5_000,
      fixedAmount: undefined,
      maxDiscountAmount: 3_000,
    });
    const buyer = await createBuyer();
    const { product: productA, size: sizeA } = await createPurchasableProduct(2_000);
    const { product: productB, size: sizeB } = await createPurchasableProduct(2_000);

    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: productA.id, sizeId: sizeA.id, qty: 1 });
    const addSecond = await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: productB.id, sizeId: sizeB.id, qty: 1 });
    const secondItemId = addSecond.body.data.items.find(
      (item: { productId: string }) => item.productId === productB.id,
    ).id;

    await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code });

    await request(testApp)
      .delete(`/api/cart/items/${secondItemId}`)
      .set("Authorization", authHeaderFor(buyer.id));

    const checkout = await checkoutRequest(buyer);
    expect(checkout.status).toBe(201);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.body.data.id },
    });
    expect(order.subtotal).toBe(2_000);
    expect(order.platformDiscountTotal).toBe(1_000);
  });

  it("recomputes eligibility once a brand discount ends between cart view and checkout", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({
      createdById: adminId,
      fixedAmount: 200,
      stacksWithBrandDiscount: false,
    });
    const buyer = await createBuyer();
    const { product, size } = await createPurchasableProduct(2_000);
    const discount = await prisma.productDiscount.create({
      data: {
        productId: product.id,
        discountType: "FIXED",
        fixedAmount: 500,
        startsAt: new Date(Date.now() - 1000),
        isActive: true,
        createdById: adminId,
      },
    });

    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: product.id, sizeId: size.id, qty: 1 });

    const applyWhileDiscounted = await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code });
    expect(applyWhileDiscounted.status).toBe(400);
    expect(applyWhileDiscounted.body.code).toBe("COUPON_NOT_ELIGIBLE_FOR_ITEMS");

    await prisma.productDiscount.update({
      where: { id: discount.id },
      data: { isActive: false },
    });

    const reapply = await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code });
    expect(reapply.status).toBe(200);

    const checkout = await checkoutRequest(buyer);
    expect(checkout.status).toBe(201);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: checkout.body.data.id } });
    expect(order.brandDiscountTotal).toBe(0);
    expect(order.platformDiscountTotal).toBe(200);
  });

  it("ignores an applied cart coupon on the Buy Now path", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 200 });
    const buyer = await createBuyer();
    const { product: cartProduct, size: cartSize } = await createPurchasableProduct(2_000);
    const { product: buyNowProduct, size: buyNowSize } = await createPurchasableProduct(1_500);

    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: cartProduct.id, sizeId: cartSize.id, qty: 1 });
    await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code });

    const checkout = await checkoutRequest(buyer, {
      buyNow: { productId: buyNowProduct.id, sizeId: buyNowSize.id, qty: 1 },
    });
    expect(checkout.status).toBe(201);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: checkout.body.data.id } });
    expect(order.platformDiscountTotal).toBe(0);
    expect(order.total).toBe(1_500 + 100);

    const redemption = await prisma.couponRedemption.findUnique({
      where: { orderId: checkout.body.data.id },
    });
    expect(redemption).toBeNull();

    const updatedCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
    expect(updatedCoupon.spentAmount).toBe(0);
  });

  it("splits a multi-brand cart's coupon discount onto only the eligible brand's line", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const { brand: brandA, product: productA, size: sizeA } = await createPurchasableProduct(2_000);
    const { product: productB, size: sizeB } = await createPurchasableProduct(2_000);
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 300 });
    await prisma.couponEligibility.create({
      data: { couponId: coupon.id, scopeType: "BRAND", scopeId: brandA.id },
    });
    const buyer = await createBuyer();

    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: productA.id, sizeId: sizeA.id, qty: 1 });
    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: productB.id, sizeId: sizeB.id, qty: 1 });
    const apply = await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code });
    expect(apply.status).toBe(200);
    expect(apply.body.data.platformDiscountTotal).toBe(300);

    const checkout = await checkoutRequest(buyer);
    expect(checkout.status).toBe(201);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.body.data.id },
      include: { items: true },
    });
    const brandAItem = order.items.find((item) => item.productId === productA.id);
    const brandBItem = order.items.find((item) => item.productId === productB.id);
    expect(brandAItem?.platformDiscountAmount).toBe(300);
    expect(brandBItem?.platformDiscountAmount).toBe(0);
  });
});
