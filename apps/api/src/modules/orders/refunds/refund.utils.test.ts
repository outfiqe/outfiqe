import { describe, expect, it } from "vitest";

import {
  FulfilmentMode,
  FulfilmentStatus,
  OrderRefundCause,
  PaymentMethod,
  PaymentStatus,
  PickupStatus,
} from "#generated/prisma/enums.js";

import {
  couponBudgetReleaseTarget,
  isRefundBlockedWhileCashParcelOnTheWay,
  isRefundCoveredByOutfiqe,
  resizeBrandPayout,
} from "./refund.utils.js";

describe("resizeBrandPayout", () => {
  it("shrinks the gross, Outfiqe's fee and the brand's share by the units kept", () => {
    expect(
      resizeBrandPayout({
        unitPrice: 1000,
        qty: 3,
        keptQtyBefore: 3,
        keptQtyAfter: 2,
        fullLinePlatformFee: 105,
        currentGatewayFee: 60,
      }),
    ).toEqual({ grossAmount: 2000, platformFee: 70, gatewayFee: 40, netAmount: 1930 });
  });

  it("works the fee out from the full line every time, so repeated refunds don't drift", () => {
    const afterSecondRefund = resizeBrandPayout({
      unitPrice: 200,
      qty: 3,
      keptQtyBefore: 2,
      keptQtyAfter: 1,
      fullLinePlatformFee: 30,
      currentGatewayFee: 8,
    });

    expect(afterSecondRefund).toEqual({
      grossAmount: 200,
      platformFee: 10,
      gatewayFee: 4,
      netAmount: 190,
    });
  });

  it("drops everything to zero when nothing is kept", () => {
    expect(
      resizeBrandPayout({
        unitPrice: 500,
        qty: 2,
        keptQtyBefore: 0,
        keptQtyAfter: 0,
        fullLinePlatformFee: 30,
        currentGatewayFee: 0,
      }),
    ).toEqual({ grossAmount: 0, platformFee: 0, gatewayFee: 0, netAmount: 0 });
  });
});

describe("couponBudgetReleaseTarget", () => {
  it("releases the platform-funded part in proportion to the coupon discount refunded", () => {
    expect(
      couponBudgetReleaseTarget({
        platformFundedAmount: 300,
        discountAmount: 400,
        refundedCouponDiscount: 100,
      }),
    ).toBe(75);
  });

  it("never releases more than the platform funded, and nothing for a free coupon", () => {
    expect(
      couponBudgetReleaseTarget({
        platformFundedAmount: 300,
        discountAmount: 400,
        refundedCouponDiscount: 400,
      }),
    ).toBe(300);
    expect(
      couponBudgetReleaseTarget({
        platformFundedAmount: 0,
        discountAmount: 0,
        refundedCouponDiscount: 0,
      }),
    ).toBe(0);
  });
});

describe("isRefundCoveredByOutfiqe", () => {
  const shippedByBrand = {
    fulfilmentMode: FulfilmentMode.BRAND_SHIPS,
    status: FulfilmentStatus.SHIPPED,
    pickupStatus: null,
  };
  const stillPacking = {
    fulfilmentMode: FulfilmentMode.BRAND_SHIPS,
    status: FulfilmentStatus.PACKED,
    pickupStatus: null,
  };
  const collectedByRider = {
    fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
    status: FulfilmentStatus.PLACED,
    pickupStatus: PickupStatus.IN_PARCEL,
  };
  const waitingForRider = {
    fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
    status: FulfilmentStatus.PLACED,
    pickupStatus: PickupStatus.READY_FOR_PICKUP,
  };

  it.each([
    { cause: OrderRefundCause.STAFF_ADJUSTMENT, fulfilment: shippedByBrand },
    { cause: OrderRefundCause.STAFF_ADJUSTMENT, fulfilment: collectedByRider },
    { cause: OrderRefundCause.PARTNER_FAILED, fulfilment: collectedByRider },
  ])("covers a $cause refund once the brand has handed the goods over", ({ cause, fulfilment }) => {
    expect(isRefundCoveredByOutfiqe({ cause, restockUnits: false, fulfilment })).toBe(true);
  });

  it("leaves a delivery failure to the brand when it shipped with its own courier", () => {
    expect(
      isRefundCoveredByOutfiqe({
        cause: OrderRefundCause.PARTNER_FAILED,
        restockUnits: false,
        fulfilment: shippedByBrand,
      }),
    ).toBe(false);
  });

  it.each([
    OrderRefundCause.BRAND_UNAVAILABLE,
    OrderRefundCause.HUB_INSPECTION_FAILED,
    OrderRefundCause.CUSTOMER_CANCELLED,
    OrderRefundCause.CUSTOMER_REFUSED,
    OrderRefundCause.RETURNED,
    OrderRefundCause.SOLD_OUT_AT_PAYMENT,
  ])("leaves a %s refund to the brand's payout", (cause) => {
    expect(
      isRefundCoveredByOutfiqe({ cause, restockUnits: false, fulfilment: shippedByBrand }),
    ).toBe(false);
  });

  it.each([stillPacking, waitingForRider])(
    "leaves a goodwill refund to the brand while the goods are still with the brand",
    (fulfilment) => {
      expect(
        isRefundCoveredByOutfiqe({
          cause: OrderRefundCause.STAFF_ADJUSTMENT,
          restockUnits: false,
          fulfilment,
        }),
      ).toBe(false);
    },
  );

  it("leaves it to the brand when the units go back into its stock or there is no shipment", () => {
    expect(
      isRefundCoveredByOutfiqe({
        cause: OrderRefundCause.STAFF_ADJUSTMENT,
        restockUnits: true,
        fulfilment: shippedByBrand,
      }),
    ).toBe(false);
    expect(
      isRefundCoveredByOutfiqe({
        cause: OrderRefundCause.STAFF_ADJUSTMENT,
        restockUnits: false,
        fulfilment: null,
      }),
    ).toBe(false);
  });
});

describe("isRefundBlockedWhileCashParcelOnTheWay", () => {
  const shippedByBrand = {
    fulfilmentMode: FulfilmentMode.BRAND_SHIPS,
    status: FulfilmentStatus.SHIPPED,
    pickupStatus: null,
  };
  const deliveredByBrand = { ...shippedByBrand, status: FulfilmentStatus.DELIVERED };
  const stillPacking = { ...shippedByBrand, status: FulfilmentStatus.PACKED };
  const inOutfiqeParcel = {
    fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
    status: FulfilmentStatus.PLACED,
    pickupStatus: PickupStatus.IN_PARCEL,
  };
  const unpaidCashOrder = { paymentMethod: PaymentMethod.COD, paymentStatus: PaymentStatus.DUE };

  it("blocks a goodwill refund on a cash parcel the brand has shipped", () => {
    expect(
      isRefundBlockedWhileCashParcelOnTheWay({
        ...unpaidCashOrder,
        cause: OrderRefundCause.STAFF_ADJUSTMENT,
        refundedItemFulfilments: [shippedByBrand],
      }),
    ).toBe(true);
  });

  it("blocks it on a cash parcel inside an Outfiqe delivery too", () => {
    expect(
      isRefundBlockedWhileCashParcelOnTheWay({
        ...unpaidCashOrder,
        cause: OrderRefundCause.CUSTOMER_REFUSED,
        refundedItemFulfilments: [inOutfiqeParcel],
      }),
    ).toBe(true);
  });

  it("still lets staff refund a parcel the delivery partner lost or damaged", () => {
    expect(
      isRefundBlockedWhileCashParcelOnTheWay({
        ...unpaidCashOrder,
        cause: OrderRefundCause.PARTNER_FAILED,
        refundedItemFulfilments: [shippedByBrand],
      }),
    ).toBe(false);
  });

  it.each([
    ["the brand still has the goods", stillPacking],
    ["the parcel was delivered", deliveredByBrand],
    ["the item has no shipment", null],
  ])("allows any refund when %s", (_situation, fulfilment) => {
    expect(
      isRefundBlockedWhileCashParcelOnTheWay({
        ...unpaidCashOrder,
        cause: OrderRefundCause.STAFF_ADJUSTMENT,
        refundedItemFulfilments: [fulfilment],
      }),
    ).toBe(false);
  });

  it("leaves orders paid online alone", () => {
    expect(
      isRefundBlockedWhileCashParcelOnTheWay({
        paymentMethod: PaymentMethod.ESEWA,
        paymentStatus: PaymentStatus.PAID,
        cause: OrderRefundCause.STAFF_ADJUSTMENT,
        refundedItemFulfilments: [shippedByBrand],
      }),
    ).toBe(false);
  });
});
