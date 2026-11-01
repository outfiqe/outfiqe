import { describe, expect, it } from "vitest";

import { FulfilmentStatus, PaymentMethod } from "#generated/prisma/enums.js";

import type { OrderAnalyticsSummary } from "./product-analytics.types.js";
import {
  toEventPublishedAt,
  toOrderPlacedProperties,
  toStableEventUuid,
  toTrackedOrderStatus,
} from "./product-analytics.utils.js";

const UUID_VERSION_5_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const orderSummary = (overrides: Partial<OrderAnalyticsSummary> = {}): OrderAnalyticsSummary => ({
  orderId: "order-1",
  userId: "user-1",
  total: 4600,
  paymentMethod: PaymentMethod.ESEWA,
  itemQuantity: 3,
  brandCount: 2,
  earlierPlacedOrderCount: 0,
  hasCreatorAttribution: true,
  hasCoupon: false,
  ...overrides,
});

describe("toStableEventUuid", () => {
  it("turns the same bus event into the same valid UUID every time", () => {
    const firstDelivery = toStableEventUuid("product.purchased:1730000000000-0");
    const redelivery = toStableEventUuid("product.purchased:1730000000000-0");

    expect(firstDelivery).toBe(redelivery);
    expect(firstDelivery).toMatch(UUID_VERSION_5_PATTERN);
  });

  it("gives different bus events different UUIDs", () => {
    expect(toStableEventUuid("product.purchased:1-0")).not.toBe(
      toStableEventUuid("product.purchased:2-0"),
    );
  });
});

describe("toEventPublishedAt", () => {
  it("reads when the bus event was published from its stream entry id", () => {
    expect(toEventPublishedAt("product.purchased:1730000000000-3")).toEqual(
      new Date(1730000000000),
    );
  });

  it("gives the same time on a redelivery, so PostHog sees an exact duplicate", () => {
    expect(toEventPublishedAt("order.status.changed:1730000000000-0")).toEqual(
      toEventPublishedAt("order.status.changed:1730000000000-0"),
    );
  });

  it("returns null for an id that isn't a stream entry", () => {
    expect(toEventPublishedAt("not-a-stream-id")).toBeNull();
  });
});

describe("toTrackedOrderStatus", () => {
  it("tracks the statuses that end an order's journey", () => {
    expect(toTrackedOrderStatus(FulfilmentStatus.DELIVERED)).toBe("delivered");
    expect(toTrackedOrderStatus(FulfilmentStatus.CANCELLED)).toBe("cancelled");
    expect(toTrackedOrderStatus(FulfilmentStatus.RETURNED)).toBe("returned");
  });

  it("ignores the in-between statuses", () => {
    expect(toTrackedOrderStatus(FulfilmentStatus.PLACED)).toBeNull();
    expect(toTrackedOrderStatus(FulfilmentStatus.PACKED)).toBeNull();
    expect(toTrackedOrderStatus(FulfilmentStatus.SHIPPED)).toBeNull();
  });
});

describe("toOrderPlacedProperties", () => {
  it("describes the order without any personal details", () => {
    expect(toOrderPlacedProperties(orderSummary())).toEqual({
      order_id: "order-1",
      order_total_npr: 4600,
      cart_item_count: 3,
      brand_count: 2,
      payment_method: "esewa",
      is_first_order: true,
      has_creator_attribution: true,
      has_coupon: false,
    });
  });

  it("marks a repeat order as not the first", () => {
    expect(toOrderPlacedProperties(orderSummary({ earlierPlacedOrderCount: 2 }))).toMatchObject({
      is_first_order: false,
    });
  });
});
