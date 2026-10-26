import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS, IDEMPOTENCY_HEADER } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  BrandIncidentKind,
  BrandReturnSource,
  BrandReturnStatus,
  FulfilmentStatus,
  OrderRefundCause,
  PartnerBookingStatus,
  PaymentMethod,
  PaymentStatus,
  PickupStatus,
  ShipmentStatus,
  TrackingEventCode,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createRoleLimitedStaffSession } from "#test/integration/auth-helpers.js";
import {
  createOrderOnItsWayToHub,
  createStaffForHub,
} from "#test/integration/hub-operation-fixtures.js";
import { createHub, requireFixtureId } from "#test/integration/logistics-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

const HUB_PATH = "/api/logistics/hub";
const DELIVERY_FEE = 100;

const withKey = () => `hub-${randomUUID()}`;

const checkIn = (
  authHeader: string,
  body: { hubId: string; code: string; countedUnits: number },
  idempotencyKey: string = withKey(),
) =>
  request(testApp)
    .post(`${HUB_PATH}/check-ins`)
    .set("Authorization", authHeader)
    .set(IDEMPOTENCY_HEADER, idempotencyKey)
    .send(body);

const inspect = (authHeader: string, groupId: string, lines: unknown[]) =>
  request(testApp)
    .post(`${HUB_PATH}/pickups/${groupId}/inspection`)
    .set("Authorization", authHeader)
    .send({ lines });

const pack = (authHeader: string, orderId: string, body: Record<string, unknown> = {}) =>
  request(testApp)
    .post(`${HUB_PATH}/orders/${orderId}/parcels`)
    .set("Authorization", authHeader)
    .send({ weightGrams: 900, parcelCount: 1, ...body });

const book = (authHeader: string, shipmentId: string, partnerReference: string) =>
  request(testApp)
    .post(`${HUB_PATH}/shipments/${shipmentId}/booking`)
    .set("Authorization", authHeader)
    .send({ partnerReference });

const printLabel = (authHeader: string, shipmentId: string) =>
  request(testApp)
    .post(`${HUB_PATH}/shipments/${shipmentId}/label-printed`)
    .set("Authorization", authHeader);

const handOver = (authHeader: string, body: { hubId: string; code: string }) =>
  request(testApp)
    .post(`${HUB_PATH}/handovers`)
    .set("Authorization", authHeader)
    .set(IDEMPOTENCY_HEADER, withKey())
    .send(body);

const checkInEveryBag = async (
  authHeader: string,
  hubId: string,
  pickups: { bagTagCode: string; qty: number }[],
) => {
  for (const { bagTagCode, qty } of pickups) {
    const response = await checkIn(authHeader, { hubId, code: bagTagCode, countedUnits: qty });
    expect(response.status).toBe(HTTP_STATUS.OK);
  }
};

const passEveryBag = async (authHeader: string, pickups: { groupId: string; itemId: string }[]) => {
  for (const { groupId, itemId } of pickups) {
    const response = await inspect(authHeader, groupId, [{ orderItemId: itemId, failedQty: 0 }]);
    expect(response.status).toBe(HTTP_STATUS.OK);
  }
};

beforeEach(async () => {
  await redis.flushdb();
});

describe("hub flow from check-in to delivery", () => {
  it("checks bags in, packs one parcel, books it by hand, hands it over and delivers it", async () => {
    const { order, hub, partner, staff, pickups } = await createOrderOnItsWayToHub({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      deliveryFee: DELIVERY_FEE,
      lines: [
        { unitPrice: 1200, qty: 1 },
        { unitPrice: 800, qty: 2 },
      ],
    });

    await checkInEveryBag(staff.authHeader, hub.id, pickups);
    await passEveryBag(staff.authHeader, pickups);

    const packed = await pack(staff.authHeader, order.id);
    expect(packed.status).toBe(HTTP_STATUS.CREATED);
    expect(packed.body.data).toMatchObject({
      status: ShipmentStatus.PACKED,
      codAmountToCollect: 1200 + 1600 + DELIVERY_FEE,
      booking: { partnerId: partner.id, status: PartnerBookingStatus.REQUESTED },
    });
    const { shipmentId, trackingCode } = packed.body.data;
    expect(trackingCode).toMatch(/^OFQ[0-9A-Z]{8}$/);
    const groups = await prisma.orderFulfilmentGroup.findMany({ where: { orderId: order.id } });
    expect(groups.every((group) => group.pickupStatus === PickupStatus.IN_PARCEL)).toBe(true);
    expect(groups.every((group) => group.shipmentId === shipmentId)).toBe(true);

    expect((await book(staff.authHeader, shipmentId, "PX-55821")).status).toBe(HTTP_STATUS.OK);
    expect((await printLabel(staff.authHeader, shipmentId)).body.data.isLabelUpToDate).toBe(true);

    const handedOver = await handOver(staff.authHeader, { hubId: hub.id, code: trackingCode });
    expect(handedOver.body.data).toMatchObject({ status: ShipmentStatus.HANDED_TO_PARTNER });
    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).fulfilmentStatus,
    ).toBe(FulfilmentStatus.SHIPPED);

    const delivered = await request(testApp)
      .post(`/api/logistics/admin/partners/${partner.id}/status-imports`)
      .set("Authorization", staff.authHeader)
      .send({
        fileName: "daily.csv",
        csv: `Partner ID,Status,Time\nPX-55821,Delivered,${new Date().toISOString()}\n`,
      });
    expect(delivered.status).toBe(HTTP_STATUS.CREATED);
    expect(delivered.body.data).toMatchObject({ rowCount: 1, appliedCount: 1 });

    const finishedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(finishedOrder.fulfilmentStatus).toBe(FulfilmentStatus.DELIVERED);
    expect(finishedOrder.deliveredAt).not.toBeNull();
    expect((await prisma.shipment.findUniqueOrThrow({ where: { id: shipmentId } })).status).toBe(
      ShipmentStatus.DELIVERED,
    );
  });
});

describe("checking bags in", () => {
  it("accepts the pickup code, records a short count and replays a repeated scan", async () => {
    const { hub, staff, pickups } = await createOrderOnItsWayToHub({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 500, qty: 3 }],
    });
    const [pickup] = pickups;
    const group = await prisma.orderFulfilmentGroup.findUniqueOrThrow({
      where: { id: requireFixtureId(pickup?.groupId) },
    });
    const idempotencyKey = withKey();
    const body = {
      hubId: hub.id,
      code: requireFixtureId(group.pickupCode ?? undefined),
      countedUnits: 2,
    };

    const first = await checkIn(staff.authHeader, body, idempotencyKey);
    const replay = await checkIn(staff.authHeader, body, idempotencyKey);

    expect(first.body.data).toMatchObject({
      pickupStatus: PickupStatus.AT_HUB,
      expectedUnits: 3,
      countedUnits: 2,
      hasCountMismatch: true,
    });
    expect(replay.body.data).toEqual(first.body.data);
    const mismatchEvents = await prisma.trackingEvent.count({
      where: { fulfilmentGroupId: group.id, code: TrackingEventCode.COUNT_MISMATCH },
    });
    expect(mismatchEvents).toBe(1);
  });

  it("refuses a bag for another hub, an unknown code and staff who can only look", async () => {
    const { staff, pickups } = await createOrderOnItsWayToHub({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 500, qty: 1 }],
    });
    const otherHub = await createHub();
    const bagTagCode = requireFixtureId(pickups[0]?.bagTagCode);
    const viewer = await createRoleLimitedStaffSession("platform:logistics:read");

    const wrongHub = await checkIn(staff.authHeader, {
      hubId: otherHub.id,
      code: bagTagCode,
      countedUnits: 1,
    });
    const unknownCode = await checkIn(staff.authHeader, {
      hubId: otherHub.id,
      code: "NOPE",
      countedUnits: 1,
    });
    const notAllowed = await checkIn(viewer.authHeader, {
      hubId: otherHub.id,
      code: bagTagCode,
      countedUnits: 1,
    });

    expect(wrongHub.status).toBe(HTTP_STATUS.CONFLICT);
    expect(wrongHub.body.code).toBe("PICKUP_FOR_ANOTHER_HUB");
    expect(unknownCode.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(notAllowed.status).toBe(HTTP_STATUS.FORBIDDEN);
  });
});

describe("inspecting and packing", () => {
  it("refunds units that fail inspection and lowers the cash to collect", async () => {
    const { order, hub, staff, pickups } = await createOrderOnItsWayToHub({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      deliveryFee: DELIVERY_FEE,
      lines: [{ unitPrice: 700, qty: 2 }],
    });
    await checkInEveryBag(staff.authHeader, hub.id, pickups);
    const [pickup] = pickups;

    const inspection = await inspect(staff.authHeader, requireFixtureId(pickup?.groupId), [
      { orderItemId: requireFixtureId(pickup?.itemId), failedQty: 1 },
    ]);
    const packed = await pack(staff.authHeader, order.id);

    expect(inspection.body.data).toMatchObject({ failedUnits: 1, refundId: expect.any(String) });
    expect(
      await prisma.orderRefund.findFirstOrThrow({ where: { orderId: order.id } }),
    ).toMatchObject({ cause: OrderRefundCause.HUB_INSPECTION_FAILED, totalAmount: 700 });
    expect(packed.body.data.codAmountToCollect).toBe(700 + DELIVERY_FEE);
    const failedUnitsReturn = await prisma.brandReturn.findFirstOrThrow({
      where: { fulfilmentGroupId: requireFixtureId(pickup?.groupId) },
      include: { lines: true },
    });
    expect(failedUnitsReturn).toMatchObject({
      source: BrandReturnSource.FAILED_INSPECTION,
      status: BrandReturnStatus.AT_HUB,
      lines: [expect.objectContaining({ resellableQty: 0, damagedQty: 1 })],
    });
    expect(
      await prisma.brandFulfilmentIncident.count({
        where: { orderId: order.id, kind: BrandIncidentKind.FAILED_INSPECTION },
      }),
    ).toBe(1);
  });

  it("won't pack a bag until it has been inspected", async () => {
    const { order, hub, staff, pickups } = await createOrderOnItsWayToHub({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.PAID,
      lines: [
        { unitPrice: 500, qty: 1 },
        { unitPrice: 600, qty: 1 },
      ],
    });
    const [inspectedPickup] = pickups;
    await checkInEveryBag(staff.authHeader, hub.id, pickups);
    await passEveryBag(staff.authHeader, inspectedPickup ? [inspectedPickup] : []);

    const refused = await pack(staff.authHeader, order.id);
    const refusedEvenWhenPackingWhatArrived = await pack(staff.authHeader, order.id, {
      packsOnlyPickupsAtHub: true,
    });

    expect(refused.status).toBe(HTTP_STATUS.CONFLICT);
    expect(refused.body.code).toBe("PICKUPS_NOT_INSPECTED");
    expect(refusedEvenWhenPackingWhatArrived.body.code).toBe("PICKUPS_NOT_INSPECTED");
    const groups = await prisma.orderFulfilmentGroup.findMany({ where: { orderId: order.id } });
    expect(groups.every(({ shipmentId }) => shipmentId === null)).toBe(true);
    expect(await prisma.shipment.count({ where: { orderId: order.id } })).toBe(0);

    await passEveryBag(staff.authHeader, pickups.slice(1));
    const packed = await pack(staff.authHeader, order.id);

    expect(packed.status).toBe(HTTP_STATUS.CREATED);
    expect(packed.body.data.fulfilmentGroupIds).toHaveLength(2);
  });

  it("leaves a bag whose every unit failed inspection out of the parcel", async () => {
    const { order, hub, staff, pickups } = await createOrderOnItsWayToHub({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [
        { unitPrice: 500, qty: 1 },
        { unitPrice: 600, qty: 1 },
      ],
    });
    const [emptiedPickup, keptPickup] = pickups;
    const emptiedGroupId = requireFixtureId(emptiedPickup?.groupId);
    const keptGroupId = requireFixtureId(keptPickup?.groupId);
    await checkInEveryBag(staff.authHeader, hub.id, pickups);
    await inspect(staff.authHeader, emptiedGroupId, [
      { orderItemId: requireFixtureId(emptiedPickup?.itemId), failedQty: 1 },
    ]);
    await passEveryBag(staff.authHeader, keptPickup ? [keptPickup] : []);

    const toPack = await request(testApp)
      .get(`${HUB_PATH}/orders-to-pack?hubId=${hub.id}`)
      .set("Authorization", staff.authHeader);
    const packed = await pack(staff.authHeader, order.id);

    expect(toPack.body.data.items).toEqual([
      expect.objectContaining({
        orderId: order.id,
        pickupsAtHub: [expect.objectContaining({ fulfilmentGroupId: keptGroupId })],
        otherPickups: [],
      }),
    ]);
    expect(packed.status).toBe(HTTP_STATUS.CREATED);
    expect(packed.body.data.fulfilmentGroupIds).toEqual([keptGroupId]);
    expect(
      await prisma.orderFulfilmentGroup.findUniqueOrThrow({ where: { id: emptiedGroupId } }),
    ).toMatchObject({ pickupStatus: PickupStatus.AT_HUB, shipmentId: null });
  });

  it("has nothing to pack when the only bag at the hub failed inspection completely", async () => {
    const { order, hub, staff, pickups } = await createOrderOnItsWayToHub({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 500, qty: 1 }],
    });
    const [pickup] = pickups;
    await checkInEveryBag(staff.authHeader, hub.id, pickups);
    await inspect(staff.authHeader, requireFixtureId(pickup?.groupId), [
      { orderItemId: requireFixtureId(pickup?.itemId), failedQty: 1 },
    ]);

    const toPack = await request(testApp)
      .get(`${HUB_PATH}/orders-to-pack?hubId=${hub.id}`)
      .set("Authorization", staff.authHeader);
    const packed = await pack(staff.authHeader, order.id);

    expect(toPack.body.data.items).toEqual([]);
    expect(packed.status).toBe(HTTP_STATUS.CONFLICT);
    expect(packed.body.code).toBe("NOTHING_TO_PACK");
  });

  it("waits for every bag unless staff choose to pack only what has arrived", async () => {
    const { order, hub, staff, pickups } = await createOrderOnItsWayToHub({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.PAID,
      lines: [
        { unitPrice: 500, qty: 1 },
        { unitPrice: 600, qty: 1 },
      ],
    });
    const [firstPickup] = pickups;
    const arrivedPickups = firstPickup ? [firstPickup] : [];
    await checkInEveryBag(staff.authHeader, hub.id, arrivedPickups);
    await passEveryBag(staff.authHeader, arrivedPickups);

    const refused = await pack(staff.authHeader, order.id);
    const packedEarly = await pack(staff.authHeader, order.id, { packsOnlyPickupsAtHub: true });

    expect(refused.status).toBe(HTTP_STATUS.CONFLICT);
    expect(refused.body.code).toBe("PICKUPS_STILL_COMING");
    expect(packedEarly.status).toBe(HTTP_STATUS.CREATED);
    expect(packedEarly.body.data).toMatchObject({
      codAmountToCollect: 0,
      fulfilmentGroupIds: [firstPickup?.groupId],
    });
  });
});

describe("booking and handing over", () => {
  it("checks the partner's parcel number and refuses one already used", async () => {
    const first = await createOrderOnItsWayToHub({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.PAID,
      lines: [{ unitPrice: 500, qty: 1 }],
      referencePattern: "PX-\\d{5}",
    });
    await checkInEveryBag(first.staff.authHeader, first.hub.id, first.pickups);
    await passEveryBag(first.staff.authHeader, first.pickups);
    const { shipmentId } = (await pack(first.staff.authHeader, first.order.id)).body.data;

    const badPattern = await book(first.staff.authHeader, shipmentId, "55821");
    const booked = await book(first.staff.authHeader, shipmentId, "PX-55821");
    const bookedAgain = await book(first.staff.authHeader, shipmentId, "PX-55822");

    expect(badPattern.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(booked.body.data).toMatchObject({
      status: PartnerBookingStatus.BOOKED,
      partnerReference: "PX-55821",
    });
    expect(bookedAgain.status).toBe(HTTP_STATUS.CONFLICT);
  });

  it("won't hand over a booked parcel whose label was never printed", async () => {
    const { order, hub, staff, pickups } = await createOrderOnItsWayToHub({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.PAID,
      lines: [{ unitPrice: 500, qty: 1 }],
    });
    await checkInEveryBag(staff.authHeader, hub.id, pickups);
    await passEveryBag(staff.authHeader, pickups);
    const { shipmentId, trackingCode } = (await pack(staff.authHeader, order.id)).body.data;
    await book(staff.authHeader, shipmentId, "PX-77");

    const notPrinted = await handOver(staff.authHeader, { hubId: hub.id, code: trackingCode });
    await printLabel(staff.authHeader, shipmentId);
    const handedOver = await handOver(staff.authHeader, { hubId: hub.id, code: trackingCode });

    expect(notPrinted.status).toBe(HTTP_STATUS.CONFLICT);
    expect(notPrinted.body.code).toBe("LABEL_NOT_PRINTED");
    expect(handedOver.body.data.status).toBe(ShipmentStatus.HANDED_TO_PARTNER);
  });

  it("won't hand over a parcel that isn't booked or whose label shows old cash", async () => {
    const { order, hub, staff, pickups } = await createOrderOnItsWayToHub({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 900, qty: 2 }],
    });
    await checkInEveryBag(staff.authHeader, hub.id, pickups);
    await passEveryBag(staff.authHeader, pickups);
    const { shipmentId, trackingCode } = (await pack(staff.authHeader, order.id)).body.data;

    const notBooked = await handOver(staff.authHeader, { hubId: hub.id, code: trackingCode });
    await book(staff.authHeader, shipmentId, "PX-1");
    await printLabel(staff.authHeader, shipmentId);
    const refundStaff = await createRoleLimitedStaffSession("platform:orders:manage");
    const refund = await request(testApp)
      .post(`/api/orders/admin/${order.id}/refunds`)
      .set("Authorization", refundStaff.authHeader)
      .set(IDEMPOTENCY_HEADER, withKey())
      .send({
        lines: [{ orderItemId: requireFixtureId(pickups[0]?.itemId), qty: 1 }],
        cause: OrderRefundCause.STAFF_ADJUSTMENT,
        reason: "Customer changed their mind",
      });
    const staleLabel = await handOver(staff.authHeader, { hubId: hub.id, code: trackingCode });
    await printLabel(staff.authHeader, shipmentId);
    const handedOver = await handOver(staff.authHeader, { hubId: hub.id, code: trackingCode });

    expect(notBooked.body.code).toBe("PARCEL_NOT_BOOKED");
    expect(refund.status).toBe(HTTP_STATUS.CREATED);
    expect(staleLabel.body.code).toBe("LABEL_OUT_OF_DATE");
    expect(handedOver.body.data.status).toBe(ShipmentStatus.HANDED_TO_PARTNER);
    expect(
      await prisma.trackingEvent.count({
        where: { shipmentId, code: TrackingEventCode.COD_AMOUNT_CHANGED },
      }),
    ).toBe(1);
  });

  it("rebooks with the same partner under a numbered reference and keeps the history", async () => {
    const { order, hub, partner, staff, pickups } = await createOrderOnItsWayToHub({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.PAID,
      lines: [{ unitPrice: 500, qty: 1 }],
    });
    await checkInEveryBag(staff.authHeader, hub.id, pickups);
    await passEveryBag(staff.authHeader, pickups);
    const { shipmentId, trackingCode } = (await pack(staff.authHeader, order.id)).body.data;
    await book(staff.authHeader, shipmentId, "PX-9");

    const rebooked = await request(testApp)
      .post(`${HUB_PATH}/shipments/${shipmentId}/rebook`)
      .set("Authorization", staff.authHeader)
      .send({ partnerId: partner.id, reason: "Rider never came" });

    expect(rebooked.body.data).toMatchObject({
      status: PartnerBookingStatus.REQUESTED,
      merchantReference: `${trackingCode}-2`,
      partnerReference: null,
    });
    const bookings = await prisma.shipmentPartnerBooking.findMany({
      where: { shipmentId },
      orderBy: { requestedAt: "asc" },
    });
    expect(bookings.map(({ status }) => status)).toEqual([
      PartnerBookingStatus.CANCELLED,
      PartnerBookingStatus.REQUESTED,
    ]);
  });

  it("lists parcels in the hub's queues", async () => {
    const { order, hub, staff, pickups } = await createOrderOnItsWayToHub({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.PAID,
      lines: [{ unitPrice: 500, qty: 1 }],
    });
    const viewer = await createStaffForHub();
    await checkInEveryBag(staff.authHeader, hub.id, pickups);
    await passEveryBag(staff.authHeader, pickups);

    const toPack = await request(testApp)
      .get(`${HUB_PATH}/orders-to-pack?hubId=${hub.id}`)
      .set("Authorization", viewer.authHeader);
    const { shipmentId } = (await pack(staff.authHeader, order.id)).body.data;
    const toBook = await request(testApp)
      .get(`${HUB_PATH}/shipments?hubId=${hub.id}&queue=TO_BOOK`)
      .set("Authorization", viewer.authHeader);
    const detail = await request(testApp)
      .get(`${HUB_PATH}/shipments/${shipmentId}`)
      .set("Authorization", viewer.authHeader);

    expect(toPack.body.data.items).toEqual([
      expect.objectContaining({ orderId: order.id, pickupsStillComing: 0 }),
    ]);
    expect(toBook.body.data.items).toEqual([expect.objectContaining({ shipmentId })]);
    expect(detail.body.data.events.map(({ code }: { code: string }) => code)).toEqual(
      expect.arrayContaining([TrackingEventCode.PACKED, TrackingEventCode.BOOKING_REQUESTED]),
    );
  });
});
