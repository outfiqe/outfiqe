import { subDays } from "date-fns/subDays";
import { describe, expect, it } from "vitest";

import { ShipmentStatus, TrackingEventCode } from "#generated/prisma/enums.js";

import type { CustomerParcelRecord } from "./customer-tracking.repository.js";
import {
  buildPartnerTrackingUrl,
  isWithinDisputeWindow,
  toCustomerParcelView,
  toCustomerTrackingEventView,
} from "./customer-tracking.utils.js";

const NOW = new Date("2026-10-17T10:00:00.000Z");
const INSIDE_WINDOW_DAYS = 2;
const OUTSIDE_WINDOW_DAYS = 4;

const buildParcel = (overrides: Partial<CustomerParcelRecord> = {}): CustomerParcelRecord => ({
  id: "shipment-1",
  trackingCode: "OFQ7K2M9QAB",
  status: ShipmentStatus.DELIVERED,
  deliveredAt: subDays(NOW, INSIDE_WINDOW_DAYS),
  bookings: [
    {
      partnerReference: "PX 55/821",
      partnerTrackingUrl: null,
      partner: {
        name: "Valley Courier",
        trackingUrlTemplate: "https://valley.example/t/{reference}",
      },
    },
  ],
  trackingEvents: [],
  ...overrides,
});

describe("buildPartnerTrackingUrl", () => {
  it("prefers the link the partner gave us, then fills in their template", () => {
    const [booking] = buildParcel().bookings;
    if (!booking) throw new Error("The fixture parcel has no booking");

    expect(buildPartnerTrackingUrl(booking)).toBe("https://valley.example/t/PX%2055%2F821");
    expect(
      buildPartnerTrackingUrl({ ...booking, partnerTrackingUrl: "https://valley.example/x" }),
    ).toBe("https://valley.example/x");
    expect(
      buildPartnerTrackingUrl({
        ...booking,
        partner: { ...booking.partner, trackingUrlTemplate: null },
      }),
    ).toBeNull();
  });
});

describe("isWithinDisputeWindow", () => {
  it("is open for three days after delivery and only for delivered parcels", () => {
    expect(isWithinDisputeWindow(buildParcel(), NOW)).toBe(true);
    expect(
      isWithinDisputeWindow(buildParcel({ deliveredAt: subDays(NOW, OUTSIDE_WINDOW_DAYS) }), NOW),
    ).toBe(false);
    expect(
      isWithinDisputeWindow(buildParcel({ status: ShipmentStatus.OUT_FOR_DELIVERY }), NOW),
    ).toBe(false);
    expect(isWithinDisputeWindow(buildParcel({ deliveredAt: null }), NOW)).toBe(false);
  });
});

describe("toCustomerParcelView", () => {
  it("shows our parcel code, the partner and whether the buyer can still report it", () => {
    expect(toCustomerParcelView(buildParcel(), NOW)).toEqual({
      shipmentId: "shipment-1",
      trackingCode: "OFQ-7K2M-9QAB",
      status: ShipmentStatus.DELIVERED,
      partnerName: "Valley Courier",
      partnerTrackingUrl: "https://valley.example/t/PX%2055%2F821",
      deliveredAt: subDays(NOW, INSIDE_WINDOW_DAYS).toISOString(),
      canReportNotReceived: true,
      isReportedNotReceived: false,
    });
    expect(
      toCustomerParcelView(buildParcel({ trackingEvents: [{ id: "event-1" }], bookings: [] }), NOW),
    ).toMatchObject({
      partnerName: null,
      partnerTrackingUrl: null,
      canReportNotReceived: false,
      isReportedNotReceived: true,
    });
  });
});

describe("toCustomerTrackingEventView", () => {
  it("names the brand for a pickup event and nothing for a parcel event", () => {
    expect(
      toCustomerTrackingEventView({
        id: "event-1",
        code: TrackingEventCode.PICKED_UP,
        occurredAt: NOW,
        location: null,
        reasonCode: null,
        shipmentId: null,
        fulfilmentGroup: { brand: { name: "Thread Co" } },
      }),
    ).toEqual({
      id: "event-1",
      code: TrackingEventCode.PICKED_UP,
      occurredAt: NOW.toISOString(),
      brandName: "Thread Co",
      location: null,
      reasonCode: null,
      shipmentId: null,
    });
  });
});
