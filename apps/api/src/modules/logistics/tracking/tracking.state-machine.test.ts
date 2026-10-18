import { subMinutes } from "date-fns/subMinutes";
import { describe, expect, it } from "vitest";

import { PickupStatus, ShipmentStatus } from "#generated/prisma/enums.js";

import {
  canApplyStatusMove,
  PICKUP_STATUS_NEXT,
  SHIPMENT_STATUS_NEXT,
} from "./tracking.state-machine.js";

const STATUS_SET_MINUTES_AGO = 10;
const EVENT_MINUTES_AGO_BEFORE_STATUS = 20;

const now = new Date("2026-10-15T10:00:00.000Z");
const statusSetAt = subMinutes(now, STATUS_SET_MINUTES_AGO);

const PICKUP_FINAL_STATUSES = [PickupStatus.CANCELLED, PickupStatus.RETURNED_TO_BRAND];
const SHIPMENT_FINAL_STATUSES = [
  ShipmentStatus.DELIVERED,
  ShipmentStatus.RETURNED_TO_HUB,
  ShipmentStatus.CANCELLED,
  ShipmentStatus.LOST,
];

const checkPickupMove = (currentStatus: PickupStatus, nextStatus: PickupStatus) =>
  canApplyStatusMove({
    currentStatus,
    nextStatus,
    currentStatusChangedAt: statusSetAt,
    occurredAt: now,
    isCorrection: false,
    allowedNextStatuses: PICKUP_STATUS_NEXT,
  });

const checkShipmentMove = (currentStatus: ShipmentStatus, nextStatus: ShipmentStatus) =>
  canApplyStatusMove({
    currentStatus,
    nextStatus,
    currentStatusChangedAt: statusSetAt,
    occurredAt: now,
    isCorrection: false,
    allowedNextStatuses: SHIPMENT_STATUS_NEXT,
  });

describe("PICKUP_STATUS_NEXT", () => {
  it.each([
    [PickupStatus.AWAITING_BRAND, PickupStatus.READY_FOR_PICKUP],
    [PickupStatus.READY_FOR_PICKUP, PickupStatus.PICKED_UP],
    [PickupStatus.PICKED_UP, PickupStatus.AT_HUB],
    [PickupStatus.AT_HUB, PickupStatus.IN_PARCEL],
    [PickupStatus.IN_PARCEL, PickupStatus.AT_HUB],
    [PickupStatus.IN_PARCEL, PickupStatus.RETURN_AT_HUB],
    [PickupStatus.AT_HUB, PickupStatus.RETURN_AT_HUB],
    [PickupStatus.RETURN_AT_HUB, PickupStatus.RETURNING_TO_BRAND],
    [PickupStatus.RETURNING_TO_BRAND, PickupStatus.RETURNED_TO_BRAND],
    [PickupStatus.AWAITING_BRAND, PickupStatus.CANCELLED],
    [PickupStatus.READY_FOR_PICKUP, PickupStatus.CANCELLED],
  ])("allows %s → %s", (currentStatus, nextStatus) => {
    expect(checkPickupMove(currentStatus, nextStatus)).toBe(true);
  });

  it.each([
    [PickupStatus.AWAITING_BRAND, PickupStatus.PICKED_UP],
    [PickupStatus.PICKED_UP, PickupStatus.CANCELLED],
    [PickupStatus.AT_HUB, PickupStatus.CANCELLED],
    [PickupStatus.AT_HUB, PickupStatus.READY_FOR_PICKUP],
    [PickupStatus.READY_FOR_PICKUP, PickupStatus.AWAITING_BRAND],
  ])("refuses %s → %s", (currentStatus, nextStatus) => {
    expect(checkPickupMove(currentStatus, nextStatus)).toBe(false);
  });

  it.each(PICKUP_FINAL_STATUSES)("allows nothing out of the final status %s", (finalStatus) => {
    expect(PICKUP_STATUS_NEXT[finalStatus]).toEqual([]);
  });

  it("never lists a status as its own next status", () => {
    for (const [currentStatus, nextStatuses] of Object.entries(PICKUP_STATUS_NEXT)) {
      expect(nextStatuses).not.toContain(currentStatus);
    }
  });
});

describe("SHIPMENT_STATUS_NEXT", () => {
  it.each([
    [ShipmentStatus.PACKED, ShipmentStatus.HANDED_TO_PARTNER],
    [ShipmentStatus.PACKED, ShipmentStatus.DELIVERED],
    [ShipmentStatus.HANDED_TO_PARTNER, ShipmentStatus.IN_TRANSIT],
    [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY],
    [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED],
    [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERY_FAILED],
    [ShipmentStatus.DELIVERY_FAILED, ShipmentStatus.OUT_FOR_DELIVERY],
    [ShipmentStatus.DELIVERY_FAILED, ShipmentStatus.RETURNING],
    [ShipmentStatus.RETURNING, ShipmentStatus.RETURNED_TO_HUB],
    [ShipmentStatus.IN_TRANSIT, ShipmentStatus.LOST],
    [ShipmentStatus.PACKED, ShipmentStatus.CANCELLED],
  ])("allows %s → %s", (currentStatus, nextStatus) => {
    expect(checkShipmentMove(currentStatus, nextStatus)).toBe(true);
  });

  it.each([
    [ShipmentStatus.IN_TRANSIT, ShipmentStatus.PACKED],
    [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.HANDED_TO_PARTNER],
    [ShipmentStatus.HANDED_TO_PARTNER, ShipmentStatus.CANCELLED],
    [ShipmentStatus.PACKED, ShipmentStatus.LOST],
    [ShipmentStatus.RETURNING, ShipmentStatus.DELIVERED],
  ])("refuses %s → %s", (currentStatus, nextStatus) => {
    expect(checkShipmentMove(currentStatus, nextStatus)).toBe(false);
  });

  it.each(SHIPMENT_FINAL_STATUSES)("allows nothing out of the final status %s", (finalStatus) => {
    expect(SHIPMENT_STATUS_NEXT[finalStatus]).toEqual([]);
  });

  it("never lists a status as its own next status", () => {
    for (const [currentStatus, nextStatuses] of Object.entries(SHIPMENT_STATUS_NEXT)) {
      expect(nextStatuses).not.toContain(currentStatus);
    }
  });
});

describe("canApplyStatusMove", () => {
  it("ignores an event that happened before the current status was set", () => {
    expect(
      canApplyStatusMove({
        currentStatus: ShipmentStatus.IN_TRANSIT,
        nextStatus: ShipmentStatus.OUT_FOR_DELIVERY,
        currentStatusChangedAt: statusSetAt,
        occurredAt: subMinutes(now, EVENT_MINUTES_AGO_BEFORE_STATUS),
        isCorrection: false,
        allowedNextStatuses: SHIPMENT_STATUS_NEXT,
      }),
    ).toBe(false);
  });

  it("accepts the move when the subject has no status time yet", () => {
    expect(
      canApplyStatusMove({
        currentStatus: PickupStatus.AWAITING_BRAND,
        nextStatus: PickupStatus.READY_FOR_PICKUP,
        currentStatusChangedAt: null,
        occurredAt: now,
        isCorrection: false,
        allowedNextStatuses: PICKUP_STATUS_NEXT,
      }),
    ).toBe(true);
  });

  it("never applies a move to the status the subject already has", () => {
    expect(checkShipmentMove(ShipmentStatus.IN_TRANSIT, ShipmentStatus.IN_TRANSIT)).toBe(false);
  });

  it("lets an admin correction move out of a final status", () => {
    expect(
      canApplyStatusMove({
        currentStatus: ShipmentStatus.LOST,
        nextStatus: ShipmentStatus.DELIVERED,
        currentStatusChangedAt: statusSetAt,
        occurredAt: subMinutes(now, EVENT_MINUTES_AGO_BEFORE_STATUS),
        isCorrection: true,
        allowedNextStatuses: SHIPMENT_STATUS_NEXT,
      }),
    ).toBe(true);
  });
});
