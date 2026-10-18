import { describe, expect, it } from "vitest";

import {
  buildPartnerEventDedupeKey,
  isReferenceAllowedByPattern,
  merchantReferenceForBooking,
  normalizePartnerRawStatus,
  parcelCodeFromMerchantReference,
} from "./partner-status.utils.js";

const OCCURRED_AT = new Date("2026-10-16T05:30:00.000Z");

describe("normalizePartnerRawStatus", () => {
  it("ignores case and extra spaces so renamed spellings map the same way", () => {
    expect(normalizePartnerRawStatus("  out   for delivery ")).toBe("OUT FOR DELIVERY");
  });
});

describe("parcelCodeFromMerchantReference", () => {
  it("reads our parcel code back, with or without a rebook suffix", () => {
    expect(parcelCodeFromMerchantReference("OFQ7K2M9QAB")).toBe("OFQ7K2M9QAB");
    expect(parcelCodeFromMerchantReference(" ofq7k2m9qab-2 ")).toBe("OFQ7K2M9QAB");
  });

  it("returns null for a reference that isn't one of our parcel codes", () => {
    expect(parcelCodeFromMerchantReference("ORDER-55821")).toBeNull();
  });
});

describe("merchantReferenceForBooking", () => {
  it("uses the plain code first and numbers later bookings with the same partner", () => {
    expect(merchantReferenceForBooking("OFQ7K2M9QAB", 0)).toBe("OFQ7K2M9QAB");
    expect(merchantReferenceForBooking("OFQ7K2M9QAB", 1)).toBe("OFQ7K2M9QAB-2");
  });
});

describe("buildPartnerEventDedupeKey", () => {
  it("prefers the partner's own event id", () => {
    expect(
      buildPartnerEventDedupeKey({
        partnerEventId: "evt-9",
        bookingId: "booking-1",
        rawStatus: "Delivered",
        occurredAt: OCCURRED_AT,
      }),
    ).toBe("evt-9");
  });

  it("hashes the booking, status and time so either reference gives the same key", () => {
    const fromPartnerReference = buildPartnerEventDedupeKey({
      partnerEventId: null,
      bookingId: "booking-1",
      rawStatus: "Delivered",
      occurredAt: OCCURRED_AT,
    });
    const fromParcelCode = buildPartnerEventDedupeKey({
      partnerEventId: null,
      bookingId: "booking-1",
      rawStatus: " delivered ",
      occurredAt: OCCURRED_AT,
    });

    expect(fromPartnerReference).toMatch(/^partner-sha256:[0-9a-f]{64}$/);
    expect(fromParcelCode).toBe(fromPartnerReference);
  });
});

describe("isReferenceAllowedByPattern", () => {
  it("accepts anything when the partner has no pattern", () => {
    expect(isReferenceAllowedByPattern(null, "whatever")).toBe(true);
  });

  it("matches the whole reference against the pattern", () => {
    expect(isReferenceAllowedByPattern("PX-\\d{5}", "PX-55821")).toBe(true);
    expect(isReferenceAllowedByPattern("PX-\\d{5}", "PX-55821-X")).toBe(false);
  });

  it("refuses everything when the saved pattern is broken", () => {
    expect(isReferenceAllowedByPattern("PX-(", "PX-1")).toBe(false);
  });
});
