import { describe, expect, it } from "vitest";

import {
  BrandIncidentKind,
  OrderRefundCause,
  ParcelReturnOutcome,
} from "#generated/prisma/enums.js";

import {
  calculateGoodsStillInParcel,
  isReturnGradingComplete,
  resolveReturnOutcome,
} from "./return-outcome.utils.js";

const parcelItems = [
  { id: "item-1", qty: 2, refundedQty: 0, unitPrice: 1000 },
  { id: "item-2", qty: 1, refundedQty: 1, unitPrice: 500 },
];

describe("resolveReturnOutcome", () => {
  it("records a refusal only when the customer refused correct items", () => {
    expect(resolveReturnOutcome(ParcelReturnOutcome.CUSTOMER_REFUSED_OR_UNREACHABLE)).toEqual({
      refundCause: OrderRefundCause.CUSTOMER_REFUSED,
      recordsRefusal: true,
      brandIncidentKind: null,
      opensPartnerClaim: false,
    });
  });

  it("holds the brand responsible for a wrong or damaged item", () => {
    expect(resolveReturnOutcome(ParcelReturnOutcome.WRONG_OR_DAMAGED_ITEM)).toMatchObject({
      refundCause: OrderRefundCause.HUB_INSPECTION_FAILED,
      recordsRefusal: false,
      brandIncidentKind: BrandIncidentKind.FAILED_INSPECTION,
    });
  });

  it("never charges the brand or the customer for the partner's failure", () => {
    expect(resolveReturnOutcome(ParcelReturnOutcome.PARTNER_DAMAGED_OR_LOST)).toEqual({
      refundCause: OrderRefundCause.PARTNER_FAILED,
      recordsRefusal: false,
      brandIncidentKind: null,
      opensPartnerClaim: true,
    });
  });
});

describe("isReturnGradingComplete", () => {
  it("needs every unit still in the parcel graded exactly once", () => {
    expect(
      isReturnGradingComplete(parcelItems, [
        { orderItemId: "item-1", resellableQty: 1, damagedQty: 1 },
      ]),
    ).toBe(true);
    expect(
      isReturnGradingComplete(parcelItems, [
        { orderItemId: "item-1", resellableQty: 1, damagedQty: 0 },
      ]),
    ).toBe(false);
    expect(
      isReturnGradingComplete(parcelItems, [
        { orderItemId: "item-1", resellableQty: 2, damagedQty: 0 },
        { orderItemId: "item-2", resellableQty: 1, damagedQty: 0 },
      ]),
    ).toBe(false);
    expect(
      isReturnGradingComplete(parcelItems, [
        { orderItemId: "item-1", resellableQty: 2, damagedQty: 0 },
        { orderItemId: "item-1", resellableQty: 2, damagedQty: 0 },
      ]),
    ).toBe(false);
  });
});

describe("calculateGoodsStillInParcel", () => {
  it("values only the units that weren't refunded", () => {
    expect(calculateGoodsStillInParcel(parcelItems)).toBe(2000);
  });
});
