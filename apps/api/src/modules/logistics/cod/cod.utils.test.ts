import { describe, expect, it } from "vitest";

import type { UnremittedParcelRecord } from "./cod.repository.js";
import { toUnremittedParcelView } from "./cod.utils.js";

const REMITTANCE_DAYS = 7;

const buildParcelRecord = (
  overrides: Partial<UnremittedParcelRecord> = {},
): UnremittedParcelRecord => ({
  id: "parcel-1",
  trackingCode: "OFQ7K2M9QAB",
  orderId: "order-1",
  currency: "NPR",
  codAmountToCollect: 1100,
  codCollectedAmount: 1100,
  deliveredAt: new Date("2026-10-05T08:00:00.000Z"),
  bookings: [{ partnerReference: "VC-1001", partnerFee: 100 }],
  ...overrides,
});

describe("toUnremittedParcelView", () => {
  it("is due seven days after delivery and overdue after that", () => {
    const parcel = buildParcelRecord();

    expect(
      toUnremittedParcelView(parcel, {
        codRemittanceDays: REMITTANCE_DAYS,
        now: new Date("2026-10-11T08:00:00.000Z"),
      }),
    ).toMatchObject({
      remitBy: "2026-10-12T08:00:00.000Z",
      isOverdue: false,
      hasCashMismatch: false,
      partnerReference: "VC-1001",
      quotedPartnerFee: 100,
    });
    expect(
      toUnremittedParcelView(parcel, {
        codRemittanceDays: REMITTANCE_DAYS,
        now: new Date("2026-10-13T08:00:00.000Z"),
      }),
    ).toMatchObject({ isOverdue: true });
  });

  it("flags a parcel whose collected cash differs from the label", () => {
    expect(
      toUnremittedParcelView(buildParcelRecord({ codCollectedAmount: 1000, bookings: [] }), {
        codRemittanceDays: REMITTANCE_DAYS,
        now: new Date("2026-10-06T08:00:00.000Z"),
      }),
    ).toMatchObject({
      hasCashMismatch: true,
      expectedAmount: 1100,
      collectedAmount: 1000,
      partnerReference: null,
      quotedPartnerFee: null,
    });
  });

  it("skips a parcel without a delivery time or collected amount", () => {
    expect(
      toUnremittedParcelView(buildParcelRecord({ deliveredAt: null }), {
        codRemittanceDays: REMITTANCE_DAYS,
        now: new Date(),
      }),
    ).toBeNull();
  });
});
