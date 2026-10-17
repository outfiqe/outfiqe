import { describe, expect, it } from "vitest";

import type { UnremittedParcel } from "../api/codSchemas";
import {
  dateInputValueToIso,
  defaultPartnerFee,
  sumRemittanceTotals,
  toDateInputValue,
} from "./codRemittance.utils";

const buildParcel = (overrides: Partial<UnremittedParcel>): UnremittedParcel => ({
  shipmentId: "parcel-1",
  trackingCode: "OFQ-AAAA",
  orderId: "order-1",
  currency: "NPR",
  partnerReference: "PX-1",
  quotedPartnerFee: 120,
  expectedAmount: 1100,
  collectedAmount: 1100,
  hasCashMismatch: false,
  deliveredAt: "2026-10-10T08:00:00.000Z",
  remitBy: "2026-10-17T08:00:00.000Z",
  isOverdue: false,
  ...overrides,
});

describe("sumRemittanceTotals", () => {
  it("adds up only the ticked parcels, less their fees", () => {
    const parcels = [
      buildParcel({ shipmentId: "parcel-1", collectedAmount: 1100 }),
      buildParcel({ shipmentId: "parcel-2", collectedAmount: 900 }),
      buildParcel({ shipmentId: "parcel-3", collectedAmount: 500 }),
    ];

    expect(sumRemittanceTotals(parcels, { "parcel-1": 100, "parcel-3": 0 })).toEqual({
      parcelCount: 2,
      collectedAmount: 1600,
      partnerFeeAmount: 100,
      receivedAmount: 1500,
    });
  });

  it("comes to nothing when no parcel is ticked", () => {
    expect(sumRemittanceTotals([buildParcel({})], {})).toEqual({
      parcelCount: 0,
      collectedAmount: 0,
      partnerFeeAmount: 0,
      receivedAmount: 0,
    });
  });
});

describe("date input values", () => {
  it("turns a day into the date field's value and back into local midnight", () => {
    const day = new Date(2026, 9, 17, 15, 30);

    expect(toDateInputValue(day)).toBe("2026-10-17");
    expect(dateInputValueToIso("2026-10-17")).toBe(new Date(2026, 9, 17).toISOString());
  });
});

describe("defaultPartnerFee", () => {
  it("starts from the partner's quoted fee", () => {
    expect(defaultPartnerFee(buildParcel({ quotedPartnerFee: 120 }))).toBe(120);
  });

  it("never starts above the cash collected, or below zero without a quote", () => {
    expect(defaultPartnerFee(buildParcel({ quotedPartnerFee: 500, collectedAmount: 300 }))).toBe(
      300,
    );
    expect(defaultPartnerFee(buildParcel({ quotedPartnerFee: null }))).toBe(0);
  });
});
