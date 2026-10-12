import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CouponType, PaymentMethod } from "#generated/prisma/enums.js";
import { createAdminSession } from "#test/integration/auth-helpers.js";
import {
  authHeaderFor,
  checkoutOnceWithCoupon,
  checkoutRequest,
  createActiveCommissionRule,
  createBuyer,
  createCoupon,
  createDefaultDeliveryZone,
  createPurchasableProduct,
} from "#test/integration/coupon-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

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

describe("POST /api/coupons/preview-buy-now", () => {
  it("previews the discount for a single buy-now line", async () => {
    const { userId: adminId } = await createAdminSession();
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 200 });
    const buyer = await createBuyer();
    const { product, size } = await createPurchasableProduct(2_000);

    const response = await request(testApp)
      .post("/api/coupons/preview-buy-now")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code, productId: product.id, sizeId: size.id, qty: 1 });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      code: coupon.code,
      discountAmount: 200,
      prepaidOnly: false,
    });
  });

  it("refuses an unknown code", async () => {
    const buyer = await createBuyer();
    const { product, size } = await createPurchasableProduct(2_000);

    const response = await request(testApp)
      .post("/api/coupons/preview-buy-now")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: "NOPE1234", productId: product.id, sizeId: size.id, qty: 1 });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("COUPON_NOT_FOUND");
  });
});

describe("POST /api/orders/checkout — Buy Now with a coupon", () => {
  it("applies the coupon and pays the brand exactly as though the order were full price", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId, 1_000);
    await createDefaultDeliveryZone();
    const { brand, product, size } = await createPurchasableProduct(2_000);
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 300 });
    const buyer = await createBuyer();

    const checkout = await checkoutRequest(buyer, {
      buyNow: { productId: product.id, sizeId: size.id, qty: 1 },
      couponCode: coupon.code,
    });
    expect(checkout.status).toBe(201);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.body.data.id },
      include: { items: true },
    });
    expect(order.subtotal).toBe(2_000);
    expect(order.platformDiscountTotal).toBe(300);
    expect(order.total).toBe(2_000 - 300 + 100);

    const payout = await prisma.brandPayout.findFirstOrThrow({
      where: { orderItem: { orderId: order.id } },
    });
    expect(payout.brandId).toBe(brand.id);
    expect(payout.grossAmount).toBe(2_000);

    const redemption = await prisma.couponRedemption.findUniqueOrThrow({
      where: { orderId: order.id },
    });
    expect(redemption.couponId).toBe(coupon.id);
    expect(redemption.platformFundedAmount).toBe(300);
  });

  it("refuses a coupon that's already been used by this customer", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 200 });
    const buyer = await createBuyer();
    const { product: firstProduct, size: firstSize } = await createPurchasableProduct(2_000);
    const { product: secondProduct, size: secondSize } = await createPurchasableProduct(2_000);

    const first = await checkoutRequest(buyer, {
      buyNow: { productId: firstProduct.id, sizeId: firstSize.id, qty: 1 },
      couponCode: coupon.code,
    });
    expect(first.status).toBe(201);

    const second = await checkoutRequest(buyer, {
      buyNow: { productId: secondProduct.id, sizeId: secondSize.id, qty: 1 },
      couponCode: coupon.code,
    });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe("COUPON_ALREADY_USED");
  });
});
