import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CouponType, PaymentMethod } from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/auth-helpers.js";
import {
  authHeaderFor,
  checkoutRequest,
  createActiveCommissionRule,
  createBuyer,
  createCoupon,
  createDefaultDeliveryZone,
  createPurchasableProduct,
} from "#test/integration/coupon-fixtures.js";
import { createProductDiscount } from "#test/integration/order-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

beforeEach(async () => {
  await redis.flushdb();
});

const prepareCartWithCoupon = async (price: number, couponCode: string) => {
  const buyer = await createBuyer();
  const purchasable = await createPurchasableProduct(price);
  await request(testApp)
    .post("/api/cart/items")
    .set("Authorization", authHeaderFor(buyer.id))
    .send({ productId: purchasable.product.id, sizeId: purchasable.size.id, qty: 1 });
  const applied = await request(testApp)
    .post("/api/cart/coupon")
    .set("Authorization", authHeaderFor(buyer.id))
    .send({ code: couponCode });
  return { buyer, applied, ...purchasable };
};

const setUp = async () => {
  await createDefaultDeliveryZone();
  const { userId: adminId } = await createAdminSession();
  await createActiveCommissionRule(adminId);
  return adminId;
};

describe("coupon rules at the edges", () => {
  it("never discounts more than the goods are worth", async () => {
    const adminId = await setUp();
    const coupon = await createCoupon({ createdById: adminId, fixedAmount: 5_000 });

    const { applied, buyer } = await prepareCartWithCoupon(1_000, coupon.code);
    const checkout = await checkoutRequest(buyer);

    expect(applied.body.data?.total).toBeGreaterThanOrEqual(0);
    expect(applied.body.data?.appliedCoupon?.discountAmount ?? 0).toBeLessThanOrEqual(1_000);
    if (checkout.status === 201) {
      const order = await prisma.order.findFirstOrThrow({ where: { userId: buyer.id } });
      expect(order.total).toBeGreaterThanOrEqual(0);
      expect(order.platformDiscountTotal).toBeLessThanOrEqual(order.subtotal);
    }
  });

  it("caps a percent coupon at its maximum discount", async () => {
    const adminId = await setUp();
    const coupon = await createCoupon({
      createdById: adminId,
      type: CouponType.PERCENT,
      percentBasisPoints: 5_000,
      fixedAmount: undefined,
      maxDiscountAmount: 300,
    });

    const { applied } = await prepareCartWithCoupon(2_000, coupon.code);

    expect(applied.body.data.appliedCoupon.discountAmount).toBe(300);
  });

  it("refuses a prepaid-only coupon on a cash-on-delivery checkout", async () => {
    const adminId = await setUp();
    const coupon = await createCoupon({ createdById: adminId, prepaidOnly: true });
    const { buyer } = await prepareCartWithCoupon(2_000, coupon.code);

    const checkout = await checkoutRequest(buyer, { paymentMethod: PaymentMethod.COD });

    expect(checkout.status).toBeGreaterThanOrEqual(400);
    expect(await prisma.couponRedemption.count({ where: { userId: buyer.id } })).toBe(0);
  });

  it("refuses a coupon that has not started yet", async () => {
    const adminId = await setUp();
    const coupon = await createCoupon({ createdById: adminId });
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { startsAt: new Date(Date.now() + 3_600_000) },
    });

    const { applied } = await prepareCartWithCoupon(2_000, coupon.code);

    expect(applied.status).toBeGreaterThanOrEqual(400);
  });

  it("stops after its maximum number of redemptions across different buyers", async () => {
    const adminId = await setUp();
    const coupon = await createCoupon({ createdById: adminId });
    await prisma.coupon.update({ where: { id: coupon.id }, data: { maxRedemptions: 1 } });

    const first = await prepareCartWithCoupon(2_000, coupon.code);
    const firstCheckout = await checkoutRequest(first.buyer);
    const second = await prepareCartWithCoupon(2_000, coupon.code);
    const secondCheckout = await checkoutRequest(second.buyer);

    expect(firstCheckout.status).toBe(201);
    expect(secondCheckout.status).toBeGreaterThanOrEqual(400);
    expect(await prisma.couponRedemption.count({ where: { couponId: coupon.id } })).toBe(1);
  });

  it("refuses a first-order-only coupon for a buyer with an earlier order", async () => {
    const adminId = await setUp();
    const coupon = await createCoupon({ createdById: adminId });
    await prisma.coupon.update({ where: { id: coupon.id }, data: { firstOrderOnly: true } });
    const earlier = await prepareCartWithCoupon(1_500, "UNUSED");
    expect((await checkoutRequest(earlier.buyer)).status).toBe(201);
    const secondPurchasable = await createPurchasableProduct(2_000);
    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(earlier.buyer.id))
      .send({ productId: secondPurchasable.product.id, sizeId: secondPurchasable.size.id, qty: 1 });

    const applied = await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(earlier.buyer.id))
      .send({ code: coupon.code });
    const checkout = await checkoutRequest(earlier.buyer);

    expect(applied.status >= 400 || checkout.status >= 400).toBe(true);
    expect(await prisma.couponRedemption.count({ where: { couponId: coupon.id } })).toBe(0);
  });

  it("does not stack on a brand-discounted item when the coupon forbids stacking", async () => {
    const adminId = await setUp();
    const coupon = await createCoupon({
      createdById: adminId,
      fixedAmount: 400,
      stacksWithBrandDiscount: false,
    });
    const buyer = await createBuyer();
    const { product, size } = await createPurchasableProduct(2_000);
    await createProductDiscount(product.id, adminId);
    await request(testApp)
      .post("/api/cart/items")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ productId: product.id, sizeId: size.id, qty: 1 });

    const applied = await request(testApp)
      .post("/api/cart/coupon")
      .set("Authorization", authHeaderFor(buyer.id))
      .send({ code: coupon.code });

    const discount = applied.body.data?.appliedCoupon?.discountAmount ?? 0;
    expect(discount).toBe(0);
  });
});
