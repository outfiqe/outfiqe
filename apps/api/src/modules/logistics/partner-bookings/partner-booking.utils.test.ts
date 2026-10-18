import { describe, expect, it } from "vitest";

import { DeliveryPartnerConnection, PartnerBookingStatus } from "#generated/prisma/enums.js";

import type { BookingForApiRequest } from "./partner-booking.repository.js";
import {
  calculateDeclaredValue,
  hasBeenTriedBefore,
  isLastAutomaticAttempt,
  MAX_AUTOMATIC_BOOKING_ATTEMPTS,
  toPartnerBookingRequest,
} from "./partner-booking.utils.js";

const buildBooking = (overrides: Partial<BookingForApiRequest> = {}): BookingForApiRequest => ({
  id: "booking-1",
  status: PartnerBookingStatus.REQUESTED,
  connection: DeliveryPartnerConnection.API,
  merchantReference: "OFQ7K2M9QAB",
  bookingAttempts: 0,
  lastAttemptAt: null,
  partnerId: "partner-1",
  shipmentId: "shipment-1",
  partner: { id: "partner-1", code: "valley", name: "Valley Courier", adapterKey: "HTTP_JSON" },
  partnerAccount: {
    id: "account-1",
    hubId: "hub-1",
    merchantAccountRef: "OUTFIQE-01",
    pickupPointRef: null,
    credentialsKey: "VALLEY",
  },
  shipment: {
    currency: "NPR",
    codAmountToCollect: 2400,
    weightGrams: 900,
    parcelCount: 1,
    hub: {
      name: "Kathmandu Hub",
      phoneE164: "+9779800000001",
      address: "Teku Road",
      city: "Kathmandu",
      countryCode: "NP",
    },
    order: {
      fullName: "Asha Rai",
      phone: "9812345678",
      phoneE164: null,
      address: "Baneshwor",
      landmark: "Near the temple",
      city: "Kathmandu",
      region: null,
      postalCode: null,
      countryCode: "NP",
    },
    fulfilmentGroups: [
      { items: [{ qty: 2, refundedQty: 1, unitPrice: 1000 }] },
      { items: [{ qty: 1, refundedQty: 0, unitPrice: 1400 }] },
    ],
  },
  ...overrides,
});

describe("calculateDeclaredValue", () => {
  it("counts only the units still in the parcel", () => {
    expect(
      calculateDeclaredValue([
        { qty: 3, refundedQty: 1, unitPrice: 500 },
        { qty: 1, refundedQty: 1, unitPrice: 900 },
      ]),
    ).toBe(1000);
    expect(calculateDeclaredValue([])).toBe(0);
  });
});

describe("booking attempts", () => {
  it("knows a first try from a retry, and the last automatic try", () => {
    expect(hasBeenTriedBefore({ lastAttemptAt: null })).toBe(false);
    expect(hasBeenTriedBefore({ lastAttemptAt: new Date() })).toBe(true);
    expect(isLastAutomaticAttempt(MAX_AUTOMATIC_BOOKING_ATTEMPTS - 1)).toBe(false);
    expect(isLastAutomaticAttempt(MAX_AUTOMATIC_BOOKING_ATTEMPTS)).toBe(true);
  });
});

describe("toPartnerBookingRequest", () => {
  it("sends the hub as the pickup point and the buyer as the recipient", () => {
    expect(toPartnerBookingRequest(buildBooking())).toEqual({
      merchantReference: "OFQ7K2M9QAB",
      idempotencyKey: "booking-1",
      pickup: {
        name: "Kathmandu Hub",
        phoneE164: "+9779800000001",
        address: {
          line1: "Teku Road",
          landmark: null,
          city: "Kathmandu",
          region: null,
          postalCode: null,
          countryCode: "NP",
        },
      },
      recipient: {
        fullName: "Asha Rai",
        phoneE164: "+9779812345678",
        address: {
          line1: "Baneshwor",
          landmark: "Near the temple",
          city: "Kathmandu",
          region: null,
          postalCode: null,
          countryCode: "NP",
        },
      },
      currency: "NPR",
      codAmount: 2400,
      declaredValue: 2400,
      weightGrams: 900,
      parcelCount: 1,
      contentsDescription: "Clothing and accessories",
    });
  });
});
