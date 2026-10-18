import { describe, expect, it } from "vitest";

import { FulfilmentMode, PickupStatus, ShipmentStatus } from "#generated/prisma/enums.js";

import { ORDER_TRACKING_STAGE } from "./tracking.constants.js";
import { describeOrderTrackingStage, hasTrackingStageChanged } from "./tracking.stage.js";
import type { TrackedGroupSnapshot } from "./tracking.types.js";

const hubGroup = (
  pickupStatus: PickupStatus,
  shipmentStatus: ShipmentStatus | null = null,
): TrackedGroupSnapshot => ({
  fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
  pickupStatus,
  shipmentStatus,
  hasBeenInParcel: shipmentStatus !== null,
});

const brandShippedGroup: TrackedGroupSnapshot = {
  fulfilmentMode: FulfilmentMode.BRAND_SHIPS,
  pickupStatus: null,
  shipmentStatus: null,
  hasBeenInParcel: false,
};

describe("describeOrderTrackingStage", () => {
  it("has no stage for an order whose brands all ship themselves", () => {
    expect(describeOrderTrackingStage([brandShippedGroup])).toBeNull();
  });

  it("ignores brand-shipped groups in a mixed order", () => {
    expect(describeOrderTrackingStage([brandShippedGroup, hubGroup(PickupStatus.AT_HUB)])).toEqual({
      stage: ORDER_TRACKING_STAGE.AT_HUB,
      collectedBrandCount: 1,
      totalBrandCount: 1,
    });
  });

  it("shows order placed while any brand is still packing", () => {
    expect(
      describeOrderTrackingStage([
        hubGroup(PickupStatus.AWAITING_BRAND),
        hubGroup(PickupStatus.AT_HUB),
      ])?.stage,
    ).toBe(ORDER_TRACKING_STAGE.ORDER_PLACED);
  });

  it("counts collected brands while items are still being collected", () => {
    expect(
      describeOrderTrackingStage([
        hubGroup(PickupStatus.READY_FOR_PICKUP),
        hubGroup(PickupStatus.PICKED_UP),
        hubGroup(PickupStatus.AT_HUB),
      ]),
    ).toEqual({
      stage: ORDER_TRACKING_STAGE.COLLECTING_ITEMS,
      collectedBrandCount: 2,
      totalBrandCount: 3,
    });
  });

  it("follows the parcel once every brand is packed into it", () => {
    expect(
      describeOrderTrackingStage([
        hubGroup(PickupStatus.IN_PARCEL, ShipmentStatus.OUT_FOR_DELIVERY),
        hubGroup(PickupStatus.IN_PARCEL, ShipmentStatus.OUT_FOR_DELIVERY),
      ])?.stage,
    ).toBe(ORDER_TRACKING_STAGE.OUT_FOR_DELIVERY);
  });

  it("shows the least-progressed parcel when an order went out in two parcels", () => {
    expect(
      describeOrderTrackingStage([
        hubGroup(PickupStatus.IN_PARCEL, ShipmentStatus.DELIVERED),
        hubGroup(PickupStatus.IN_PARCEL, ShipmentStatus.IN_TRANSIT),
      ])?.stage,
    ).toBe(ORDER_TRACKING_STAGE.ON_ITS_WAY);
  });

  it("puts a failed delivery attempt ahead of another parcel being out for delivery", () => {
    expect(
      describeOrderTrackingStage([
        hubGroup(PickupStatus.IN_PARCEL, ShipmentStatus.DELIVERY_FAILED),
        hubGroup(PickupStatus.IN_PARCEL, ShipmentStatus.OUT_FOR_DELIVERY),
      ])?.stage,
    ).toBe(ORDER_TRACKING_STAGE.DELIVERY_ATTEMPT_FAILED);
  });

  it("shows delivered once every parcel is delivered", () => {
    expect(
      describeOrderTrackingStage([hubGroup(PickupStatus.IN_PARCEL, ShipmentStatus.DELIVERED)])
        ?.stage,
    ).toBe(ORDER_TRACKING_STAGE.DELIVERED);
  });

  it("leaves a cancelled brand out of the progress", () => {
    expect(
      describeOrderTrackingStage([
        hubGroup(PickupStatus.CANCELLED),
        hubGroup(PickupStatus.IN_PARCEL, ShipmentStatus.PACKED),
      ]),
    ).toEqual({ stage: ORDER_TRACKING_STAGE.PACKED, collectedBrandCount: 1, totalBrandCount: 1 });
  });

  it("shows cancelled when every brand was cancelled", () => {
    expect(
      describeOrderTrackingStage([
        hubGroup(PickupStatus.CANCELLED),
        hubGroup(PickupStatus.CANCELLED),
      ])?.stage,
    ).toBe(ORDER_TRACKING_STAGE.CANCELLED);
  });

  it("shows returning when the only parcel is coming back", () => {
    expect(
      describeOrderTrackingStage([hubGroup(PickupStatus.IN_PARCEL, ShipmentStatus.RETURNING)])
        ?.stage,
    ).toBe(ORDER_TRACKING_STAGE.RETURNING);
  });

  it("shows returning while a returned parcel's items go back to the brand", () => {
    expect(
      describeOrderTrackingStage([
        hubGroup(PickupStatus.RETURNING_TO_BRAND, ShipmentStatus.RETURNED_TO_HUB),
      ])?.stage,
    ).toBe(ORDER_TRACKING_STAGE.RETURNING);
  });

  it("shows cancelled for a lost parcel, because the customer is refunded", () => {
    expect(
      describeOrderTrackingStage([hubGroup(PickupStatus.IN_PARCEL, ShipmentStatus.LOST)])?.stage,
    ).toBe(ORDER_TRACKING_STAGE.CANCELLED);
  });
});

describe("hasTrackingStageChanged", () => {
  const collecting = {
    stage: ORDER_TRACKING_STAGE.COLLECTING_ITEMS,
    collectedBrandCount: 1,
    totalBrandCount: 3,
  };

  it("is true when the stage moves on", () => {
    expect(
      hasTrackingStageChanged(collecting, { ...collecting, stage: ORDER_TRACKING_STAGE.AT_HUB }),
    ).toBe(true);
  });

  it("is true when another brand is collected within the same stage", () => {
    expect(hasTrackingStageChanged(collecting, { ...collecting, collectedBrandCount: 2 })).toBe(
      true,
    );
  });

  it("is false when nothing the customer sees changed", () => {
    expect(hasTrackingStageChanged(collecting, { ...collecting })).toBe(false);
  });

  it("is false for an order with no hub groups before or after", () => {
    expect(hasTrackingStageChanged(null, null)).toBe(false);
  });
});
