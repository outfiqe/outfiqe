import { subDays } from "date-fns/subDays";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { PaymentMethod, PaymentStatus, UserRole } from "#generated/prisma/enums.js";
import {
  createBuyer,
  createOrder,
  createPurchasableProduct,
  createUserWithRole,
} from "#test/integration/order-fixtures.js";

import { productAnalyticsRepository } from "./product-analytics.repository.js";

const MISSING_RECORD_ID = "00000000-0000-4000-8000-000000000000";
const DAYS_BEFORE_THE_ORDER = 3;

const addOrderItem = (
  orderId: string,
  item: { productId: string; sizeId: string; qty: number; attributedCreatorId?: string },
) =>
  prisma.orderItem.create({
    data: { orderId, unitPrice: 1000, listUnitPrice: 1000, ...item },
  });

const createEarlierOrder = (
  userId: string,
  paymentMethod: PaymentMethod,
  paymentStatus: PaymentStatus,
) =>
  prisma.order.create({
    data: {
      userId,
      fullName: "Test Buyer",
      phone: "9800000000",
      address: "123 Test Street",
      city: "Kathmandu",
      paymentMethod,
      paymentStatus,
      subtotal: 1000,
      deliveryFee: 100,
      total: 1100,
      createdAt: subDays(new Date(), DAYS_BEFORE_THE_ORDER),
    },
  });

describe("productAnalyticsRepository.findOrderAnalyticsSummary", () => {
  it("summarises an order: item quantity, brands, attribution and coupon", async () => {
    const buyer = await createBuyer();
    const creator = await createUserWithRole(UserRole.CUSTOMER);
    const kurta = await createPurchasableProduct(1000);
    const jacket = await createPurchasableProduct(1000);
    const order = await createOrder(buyer.id);
    await addOrderItem(order.id, { productId: kurta.product.id, sizeId: kurta.size.id, qty: 2 });
    await addOrderItem(order.id, {
      productId: jacket.product.id,
      sizeId: jacket.size.id,
      qty: 1,
      attributedCreatorId: creator.id,
    });

    const summary = await productAnalyticsRepository.findOrderAnalyticsSummary(order.id);

    expect(summary).toEqual({
      orderId: order.id,
      userId: buyer.id,
      total: order.total,
      paymentMethod: PaymentMethod.COD,
      itemQuantity: 3,
      brandCount: 2,
      earlierPlacedOrderCount: 0,
      hasCreatorAttribution: true,
      hasCoupon: false,
    });
  });

  it("counts earlier orders only when they actually went through", async () => {
    const buyer = await createBuyer();
    await createEarlierOrder(buyer.id, PaymentMethod.ESEWA, PaymentStatus.FAILED);
    await createEarlierOrder(buyer.id, PaymentMethod.KHALTI, PaymentStatus.INITIATED);
    const order = await createOrder(buyer.id);

    const firstSummary = await productAnalyticsRepository.findOrderAnalyticsSummary(order.id);
    expect(firstSummary?.earlierPlacedOrderCount).toBe(0);

    await createEarlierOrder(buyer.id, PaymentMethod.ESEWA, PaymentStatus.PAID);
    await createEarlierOrder(buyer.id, PaymentMethod.COD, PaymentStatus.DUE);

    const repeatSummary = await productAnalyticsRepository.findOrderAnalyticsSummary(order.id);
    expect(repeatSummary?.earlierPlacedOrderCount).toBe(2);
  });

  it("returns null for an order that doesn't exist", async () => {
    await expect(
      productAnalyticsRepository.findOrderAnalyticsSummary(MISSING_RECORD_ID),
    ).resolves.toBeNull();
  });
});

describe("productAnalyticsRepository lookups", () => {
  it("finds a user's role, or null for an unknown user", async () => {
    const brandOwner = await createUserWithRole(UserRole.BRAND_OWNER);

    await expect(productAnalyticsRepository.findUserRole(brandOwner.id)).resolves.toBe(
      UserRole.BRAND_OWNER,
    );
    await expect(productAnalyticsRepository.findUserRole(MISSING_RECORD_ID)).resolves.toBeNull();
  });

  it("returns null for a support ticket that doesn't exist", async () => {
    await expect(
      productAnalyticsRepository.findSupportTicketRequesterId(MISSING_RECORD_ID),
    ).resolves.toBeNull();
  });

  it("counts no product tags on a look that has none", async () => {
    await expect(productAnalyticsRepository.countLookProductTags(MISSING_RECORD_ID)).resolves.toBe(
      0,
    );
  });
});
