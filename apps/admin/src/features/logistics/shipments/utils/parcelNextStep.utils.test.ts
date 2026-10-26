import { describe, expect, it } from "vitest";

import type { ParcelSummary } from "../api/parcelsSchemas";
import { describeParcelNextStep, isParcelWaitingForBooking } from "./parcelNextStep.utils";

type ParcelBookingOverrides = Partial<NonNullable<ParcelSummary["booking"]>>;

const booking = (
  overrides: ParcelBookingOverrides = {},
): NonNullable<ParcelSummary["booking"]> => ({
  bookingId: "booking-1",
  partnerId: "partner-1",
  partnerName: "Delivery Sansar",
  status: "BOOKED",
  connection: "MANUAL",
  merchantReference: "OFQC8511GGJ",
  partnerReference: "SANSAR-1001",
  partnerTrackingUrl: null,
  failureReason: null,
  ...overrides,
});

const parcel = (
  overrides: Partial<Pick<ParcelSummary, "status" | "booking" | "isLabelUpToDate">> = {},
) => ({
  status: "PACKED" as const,
  booking: booking(),
  isLabelUpToDate: true,
  ...overrides,
});

describe("describeParcelNextStep", () => {
  it("asks for a partner when none is chosen", () => {
    expect(describeParcelNextStep(parcel({ booking: null }))).toBe("Choose a delivery partner.");
  });

  it("asks for the partner's number while a manual booking is waiting", () => {
    expect(
      describeParcelNextStep(
        parcel({ booking: booking({ status: "REQUESTED", partnerReference: null }) }),
      ),
    ).toBe("Book it in Delivery Sansar's portal, then type their parcel number here.");
  });

  it("leaves a connected partner's booking to the booking message", () => {
    expect(
      describeParcelNextStep(
        parcel({ booking: booking({ status: "REQUESTED", connection: "API" }) }),
      ),
    ).toBeNull();
  });

  it("asks for the label once the parcel is booked", () => {
    expect(describeParcelNextStep(parcel({ isLabelUpToDate: false }))).toBe(
      "Print the label and stick it on the parcel.",
    );
  });

  it("points to Hand over once the label is printed", () => {
    expect(describeParcelNextStep(parcel())).toBe(
      "Hand it over: scan the label on Hand over when Delivery Sansar's rider collects it.",
    );
  });

  it("asks for the status sheet while a manual partner has the parcel", () => {
    expect(describeParcelNextStep(parcel({ status: "IN_TRANSIT" }))).toBe(
      "Upload Delivery Sansar's status sheet on their partner page, or record an update here.",
    );
  });

  it("says nothing while a connected partner has the parcel, or once it's delivered", () => {
    expect(
      describeParcelNextStep(
        parcel({ status: "IN_TRANSIT", booking: booking({ connection: "API" }) }),
      ),
    ).toBeNull();
    expect(describeParcelNextStep(parcel({ status: "DELIVERED" }))).toBeNull();
  });
});

describe("isParcelWaitingForBooking", () => {
  it("is true only for a parcel at the hub whose booking isn't finished", () => {
    expect(isParcelWaitingForBooking(parcel({ booking: booking({ status: "REQUESTED" }) }))).toBe(
      true,
    );
    expect(isParcelWaitingForBooking(parcel())).toBe(false);
    expect(isParcelWaitingForBooking(parcel({ booking: null }))).toBe(false);
  });
});
