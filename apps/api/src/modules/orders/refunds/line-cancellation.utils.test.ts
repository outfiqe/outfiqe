import { describe, expect, it } from "vitest";

import {
  CouponRedemptionStatus,
  FulfilmentMode,
  FulfilmentStatus,
  PaymentMethod,
  PaymentStatus,
  PickupStatus,
} from "#generated/prisma/enums.js";

import {
  findLineCancellationProblem,
  isGroupStillWithBrand,
  LINE_CANCELLATION_PROBLEM,
} from "./line-cancellation.utils.js";
import type { OrderForRefund } from "./refund.repository.js";
import type { RefundPricing } from "./refund.types.js";

const brandShippedGroup = {
  id: "group-1",
  fulfilmentMode: FulfilmentMode.BRAND_SHIPS,
  status: FulfilmentStatus.PLACED,
  pickupStatus: null,
};

const buildOrder = (overrides: Partial<OrderForRefund> = {}): OrderForRefund => ({
  id: "order-1",
  userId: "buyer-1",
  phone: "9800000000",
  total: 2000,
  refundedAmount: 0,
  deliveryFee: 0,
  codFee: 0,
  paymentMethod: PaymentMethod.COD,
  paymentStatus: PaymentStatus.DUE,
  fulfilmentStatus: FulfilmentStatus.PLACED,
  items: [
    {
      id: "item-1",
      qty: 1,
      refundedQty: 0,
      unitPrice: 1000,
      platformDiscountAmount: 0,
      sizeId: "size-1",
      fulfilmentGroup: brandShippedGroup,
    },
    {
      id: "item-2",
      qty: 1,
      refundedQty: 0,
      unitPrice: 1000,
      platformDiscountAmount: 0,
      sizeId: "size-2",
      fulfilmentGroup: brandShippedGroup,
    },
  ],
  couponRedemption: null,
  ...overrides,
});

const cancellingItemOne: RefundPricing = {
  lines: [{ orderItemId: "item-1", qty: 1, amount: 1000, couponShare: 0 }],
  goodsAmount: 1000,
  feeAmount: 0,
  totalAmount: 1000,
  emptiesOrder: false,
};

describe("isGroupStillWithBrand", () => {
  it("knows when a brand-shipped or hub order has left the brand", () => {
    expect(isGroupStillWithBrand(brandShippedGroup)).toBe(true);
    expect(isGroupStillWithBrand({ ...brandShippedGroup, status: FulfilmentStatus.SHIPPED })).toBe(
      false,
    );
    expect(
      isGroupStillWithBrand({
        ...brandShippedGroup,
        fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
        pickupStatus: PickupStatus.READY_FOR_PICKUP,
      }),
    ).toBe(true);
    expect(
      isGroupStillWithBrand({
        ...brandShippedGroup,
        fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
        pickupStatus: PickupStatus.PICKED_UP,
      }),
    ).toBe(false);
  });
});

describe("findLineCancellationProblem", () => {
  it("allows cancelling an item still with the brand", () => {
    expect(findLineCancellationProblem(buildOrder(), cancellingItemOne)).toBeNull();
  });

  it("stops a cancellation that drops a coupon order below its minimum", () => {
    const order = buildOrder({
      couponRedemption: {
        id: "redemption-1",
        couponId: "coupon-1",
        discountAmount: 100,
        platformFundedAmount: 100,
        releasedAmount: 0,
        status: CouponRedemptionStatus.CONSUMED,
        coupon: { minSubtotal: 1500 },
      },
    });

    expect(findLineCancellationProblem(order, cancellingItemOne)).toBe(
      LINE_CANCELLATION_PROBLEM.COUPON_MINIMUM_NOT_MET,
    );
    expect(
      findLineCancellationProblem(order, { ...cancellingItemOne, emptiesOrder: true }),
    ).toBeNull();
  });
});
