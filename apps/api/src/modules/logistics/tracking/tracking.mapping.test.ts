import { describe, expect, it } from "vitest";

import {
  FulfilmentStatus,
  PickupStatus,
  ShipmentStatus,
  TrackingEventCode,
} from "#generated/prisma/enums.js";

import {
  buildCoarseStatusUpdate,
  buildPickupTimestampUpdate,
  pickupStatusForEventCode,
  resolveCoarseGroupStatus,
  shipmentStatusForEventCode,
} from "./tracking.mapping.js";

const changedAt = new Date("2026-10-15T10:00:00.000Z");

describe("pickupStatusForEventCode and shipmentStatusForEventCode", () => {
  it("maps a pickup event code to its pickup status", () => {
    expect(pickupStatusForEventCode(TrackingEventCode.PICKED_UP)).toBe(PickupStatus.PICKED_UP);
  });

  it("maps a parcel event code to its parcel status", () => {
    expect(shipmentStatusForEventCode(TrackingEventCode.DELIVERED)).toBe(ShipmentStatus.DELIVERED);
  });

  it("maps CANCELLED to both kinds of subject", () => {
    expect(pickupStatusForEventCode(TrackingEventCode.CANCELLED)).toBe(PickupStatus.CANCELLED);
    expect(shipmentStatusForEventCode(TrackingEventCode.CANCELLED)).toBe(ShipmentStatus.CANCELLED);
  });

  it("returns null for an event that changes no status", () => {
    expect(pickupStatusForEventCode(TrackingEventCode.NOTE)).toBeNull();
    expect(shipmentStatusForEventCode(TrackingEventCode.BAG_TAGGED)).toBeNull();
  });

  it("returns null for a parcel code on a pickup and the other way round", () => {
    expect(pickupStatusForEventCode(TrackingEventCode.DELIVERED)).toBeNull();
    expect(shipmentStatusForEventCode(TrackingEventCode.PICKED_UP)).toBeNull();
  });
});

describe("resolveCoarseGroupStatus", () => {
  it.each([
    [PickupStatus.AWAITING_BRAND, FulfilmentStatus.PLACED],
    [PickupStatus.READY_FOR_PICKUP, FulfilmentStatus.PACKED],
    [PickupStatus.PICKED_UP, FulfilmentStatus.PACKED],
    [PickupStatus.AT_HUB, FulfilmentStatus.PACKED],
    [PickupStatus.CANCELLED, FulfilmentStatus.CANCELLED],
  ])("maps the pre-parcel pickup status %s to %s", (pickupStatus, expectedStatus) => {
    expect(
      resolveCoarseGroupStatus({ pickupStatus, shipmentStatus: null, hasBeenInParcel: false }),
    ).toBe(expectedStatus);
  });

  it.each([
    [ShipmentStatus.PACKED, FulfilmentStatus.PACKED],
    [ShipmentStatus.HANDED_TO_PARTNER, FulfilmentStatus.SHIPPED],
    [ShipmentStatus.OUT_FOR_DELIVERY, FulfilmentStatus.SHIPPED],
    [ShipmentStatus.DELIVERY_FAILED, FulfilmentStatus.SHIPPED],
    [ShipmentStatus.DELIVERED, FulfilmentStatus.DELIVERED],
    [ShipmentStatus.RETURNING, FulfilmentStatus.RETURNED],
    [ShipmentStatus.LOST, FulfilmentStatus.CANCELLED],
    [ShipmentStatus.CANCELLED, FulfilmentStatus.PACKED],
  ])("takes a parcel group's status from the parcel status %s", (shipmentStatus, expected) => {
    expect(
      resolveCoarseGroupStatus({
        pickupStatus: PickupStatus.IN_PARCEL,
        shipmentStatus,
        hasBeenInParcel: true,
      }),
    ).toBe(expected);
  });

  it("treats a group in a parcel with no parcel status yet as packed", () => {
    expect(
      resolveCoarseGroupStatus({
        pickupStatus: PickupStatus.IN_PARCEL,
        shipmentStatus: null,
        hasBeenInParcel: true,
      }),
    ).toBe(FulfilmentStatus.PACKED);
  });

  it("counts a group going back to its brand from a returned parcel as returned", () => {
    expect(
      resolveCoarseGroupStatus({
        pickupStatus: PickupStatus.RETURNING_TO_BRAND,
        shipmentStatus: ShipmentStatus.RETURNED_TO_HUB,
        hasBeenInParcel: true,
      }),
    ).toBe(FulfilmentStatus.RETURNED);
  });

  it("counts a group going back to its brand before any parcel as cancelled", () => {
    expect(
      resolveCoarseGroupStatus({
        pickupStatus: PickupStatus.RETURN_AT_HUB,
        shipmentStatus: null,
        hasBeenInParcel: false,
      }),
    ).toBe(FulfilmentStatus.CANCELLED);
  });
});

describe("buildCoarseStatusUpdate", () => {
  it("stamps the timestamp that belongs to the status", () => {
    expect(buildCoarseStatusUpdate(FulfilmentStatus.DELIVERED, changedAt)).toEqual({
      status: FulfilmentStatus.DELIVERED,
      deliveredAt: changedAt,
    });
  });

  it("stamps nothing for a placed group", () => {
    expect(buildCoarseStatusUpdate(FulfilmentStatus.PLACED, changedAt)).toEqual({
      status: FulfilmentStatus.PLACED,
    });
  });
});

describe("buildPickupTimestampUpdate", () => {
  it.each([
    [PickupStatus.READY_FOR_PICKUP, "readyForPickupAt"],
    [PickupStatus.PICKED_UP, "pickedUpAt"],
    [PickupStatus.AT_HUB, "atHubAt"],
  ])("stamps %s on %s", (pickupStatus, field) => {
    expect(buildPickupTimestampUpdate(pickupStatus, changedAt)).toEqual({ [field]: changedAt });
  });

  it("stamps nothing for a status without its own timestamp", () => {
    expect(buildPickupTimestampUpdate(PickupStatus.IN_PARCEL, changedAt)).toEqual({});
  });
});
