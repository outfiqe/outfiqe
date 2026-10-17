import request from "supertest";
import { describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  BrandIncidentKind,
  BrandReturnStatus,
  OrderRefundCause,
  ParcelReturnOutcome,
  PartnerClaimStatus,
  PaymentMethod,
  PaymentStatus,
  PickupStatus,
  ShipmentStatus,
  TrackingEventCode,
  TrackingEventSource,
} from "#generated/prisma/enums.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { createAdminSession } from "#test/integration/auth-helpers.js";
import { createParcelOnItsWayBack } from "#test/integration/return-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import { TRACKING_SUBJECT_KIND } from "../tracking/tracking.constants.js";
import { logisticsTrackingService } from "../tracking/tracking.service.js";
import { logisticsLostParcelService } from "./lost-parcel.service.js";

const HUB_PATH = "/api/logistics/hub";
const DELIVERY_FEE = 100;
const SHIRT_PRICE = 1000;
const JACKET_PRICE = 2000;

const checkInReturn = (
  authHeader: string,
  shipmentId: string,
  body: { outcome: ParcelReturnOutcome; lines: unknown[] },
) =>
  request(testApp)
    .post(`${HUB_PATH}/shipments/${shipmentId}/return-check-in`)
    .set("Authorization", authHeader)
    .send(body);

const gradeEverything = (
  items: { item: { id: string; qty: number } }[],
  grade: "resellable" | "damaged",
) =>
  items.map(({ item }) => ({
    orderItemId: item.id,
    resellableQty: grade === "resellable" ? item.qty : 0,
    damagedQty: grade === "damaged" ? item.qty : 0,
  }));

const createTwoBrandParcel = (paymentMethod: PaymentMethod, paymentStatus: PaymentStatus) =>
  createParcelOnItsWayBack({
    paymentMethod,
    paymentStatus,
    deliveryFee: DELIVERY_FEE,
    lines: [
      { unitPrice: SHIRT_PRICE, qty: 1 },
      { unitPrice: JACKET_PRICE, qty: 1 },
    ],
  });

describe("checking a returned parcel back in", () => {
  it("treats a refused cash order as nothing owed, records the refusal and sends the items back", async () => {
    const { order, shipment, items, staff } = await createTwoBrandParcel(
      PaymentMethod.COD,
      PaymentStatus.DUE,
    );

    const response = await checkInReturn(staff.authHeader, shipment.id, {
      outcome: ParcelReturnOutcome.CUSTOMER_REFUSED_OR_UNREACHABLE,
      lines: gradeEverything(items, "resellable"),
    });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data).toMatchObject({ recordedRefusal: true, partnerClaimAmount: null });
    expect(response.body.data.brandReturnIds).toHaveLength(2);
    const refund = await prisma.orderRefund.findUniqueOrThrow({
      where: { id: response.body.data.refundId },
    });
    expect(refund).toMatchObject({
      cause: OrderRefundCause.CUSTOMER_REFUSED,
      totalAmount: SHIRT_PRICE + JACKET_PRICE + DELIVERY_FEE,
    });
    expect(await prisma.customerDeliveryRefusal.count({ where: { userId: order.userId } })).toBe(1);
    const parcel = await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
    expect(parcel).toMatchObject({
      status: ShipmentStatus.RETURNED_TO_HUB,
      returnOutcome: ParcelReturnOutcome.CUSTOMER_REFUSED_OR_UNREACHABLE,
    });
    const pickups = await prisma.orderFulfilmentGroup.findMany({ where: { orderId: order.id } });
    expect(pickups.map(({ pickupStatus }) => pickupStatus)).toEqual([
      PickupStatus.RETURN_AT_HUB,
      PickupStatus.RETURN_AT_HUB,
    ]);
    const brandReturns = await prisma.brandReturn.findMany({
      where: { shipmentId: shipment.id },
      include: { lines: true },
    });
    expect(brandReturns).toHaveLength(2);
    expect(brandReturns.every(({ status }) => status === BrandReturnStatus.AT_HUB)).toBe(true);
    expect(brandReturns.flatMap(({ lines }) => lines)).toEqual(
      expect.arrayContaining([expect.objectContaining({ resellableQty: 1, damagedQty: 0 })]),
    );

    const repeat = await checkInReturn(staff.authHeader, shipment.id, {
      outcome: ParcelReturnOutcome.CUSTOMER_REFUSED_OR_UNREACHABLE,
      lines: gradeEverything(items, "resellable"),
    });
    expect(repeat.status).toBe(HTTP_STATUS.CONFLICT);
  });

  it("keeps the delivery fee when a prepaid customer refuses", async () => {
    const { shipment, items, staff } = await createTwoBrandParcel(
      PaymentMethod.ESEWA,
      PaymentStatus.PAID,
    );

    const response = await checkInReturn(staff.authHeader, shipment.id, {
      outcome: ParcelReturnOutcome.CUSTOMER_REFUSED_OR_UNREACHABLE,
      lines: gradeEverything(items, "resellable"),
    });

    expect(response.status).toBe(HTTP_STATUS.OK);
    const refund = await prisma.orderRefund.findUniqueOrThrow({
      where: { id: response.body.data.refundId },
    });
    expect(refund.totalAmount).toBe(SHIRT_PRICE + JACKET_PRICE);
  });

  it("refunds everything and counts it against the brands for a wrong or damaged item", async () => {
    const { shipment, items, staff } = await createTwoBrandParcel(
      PaymentMethod.ESEWA,
      PaymentStatus.PAID,
    );

    const response = await checkInReturn(staff.authHeader, shipment.id, {
      outcome: ParcelReturnOutcome.WRONG_OR_DAMAGED_ITEM,
      lines: gradeEverything(items, "damaged"),
    });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data.recordedRefusal).toBe(false);
    const refund = await prisma.orderRefund.findUniqueOrThrow({
      where: { id: response.body.data.refundId },
    });
    expect(refund).toMatchObject({
      cause: OrderRefundCause.HUB_INSPECTION_FAILED,
      totalAmount: SHIRT_PRICE + JACKET_PRICE + DELIVERY_FEE,
    });
    const brandIds = items.map(({ group }) => group.brandId);
    expect(
      await prisma.brandFulfilmentIncident.count({
        where: { brandId: { in: brandIds }, kind: BrandIncidentKind.FAILED_INSPECTION },
      }),
    ).toBe(2);
  });

  it("opens a claim against the partner for damage they caused, and charges no one else", async () => {
    const { order, shipment, items, staff } = await createTwoBrandParcel(
      PaymentMethod.ESEWA,
      PaymentStatus.PAID,
    );

    const response = await checkInReturn(staff.authHeader, shipment.id, {
      outcome: ParcelReturnOutcome.PARTNER_DAMAGED_OR_LOST,
      lines: gradeEverything(items, "damaged"),
    });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data.partnerClaimAmount).toBe(SHIRT_PRICE + JACKET_PRICE);
    const parcel = await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
    expect(parcel.partnerClaimStatus).toBe(PartnerClaimStatus.OPEN);
    expect(await prisma.brandFulfilmentIncident.count()).toBe(0);
    expect(await prisma.customerDeliveryRefusal.count({ where: { userId: order.userId } })).toBe(0);
  });

  it("needs every unit graded, and only for a parcel that went out", async () => {
    const { shipment, items, staff } = await createTwoBrandParcel(
      PaymentMethod.COD,
      PaymentStatus.DUE,
    );
    const { shipment: parcelAtHub, items: parcelAtHubItems } = await createParcelOnItsWayBack({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: SHIRT_PRICE, qty: 1 }],
      shipmentStatus: ShipmentStatus.PACKED,
    });

    const halfGraded = await checkInReturn(staff.authHeader, shipment.id, {
      outcome: ParcelReturnOutcome.CUSTOMER_REFUSED_OR_UNREACHABLE,
      lines: gradeEverything(items, "resellable").slice(0, 1),
    });
    const notSentOut = await checkInReturn(staff.authHeader, parcelAtHub.id, {
      outcome: ParcelReturnOutcome.CUSTOMER_REFUSED_OR_UNREACHABLE,
      lines: gradeEverything(parcelAtHubItems, "resellable"),
    });

    expect(halfGraded.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(notSentOut.status).toBe(HTTP_STATUS.CONFLICT);
    expect(await prisma.orderRefund.count()).toBe(0);
  });

  it("sends hub-delivered orders to the hub check-in instead of the admin return button", async () => {
    const { order } = await createTwoBrandParcel(PaymentMethod.COD, PaymentStatus.DUE);
    const admin = await createAdminSession();

    const response = await request(testApp)
      .post(`/api/orders/admin/${order.id}/return`)
      .set("Authorization", admin.authHeader)
      .send({ reason: "Came back" });

    expect(response.status).toBe(HTTP_STATUS.CONFLICT);
    expect(response.body.code).toBe("RETURN_CHECKED_IN_AT_HUB");
  });
});

describe("lost parcels", () => {
  it("refunds everything and opens a partner claim once the parcel is reported lost", async () => {
    const { order, shipment } = await createTwoBrandParcel(PaymentMethod.ESEWA, PaymentStatus.PAID);

    await logisticsTrackingService.recordEvent({
      subject: { kind: TRACKING_SUBJECT_KIND.SHIPMENT, shipmentId: shipment.id },
      code: TrackingEventCode.LOST,
      source: TrackingEventSource.PARTNER_WEBHOOK,
      dedupeKey: `lost:${shipment.id}`,
      occurredAt: new Date(),
    });
    const queuedLoss = await prisma.outboxEvent.findFirst({
      where: { topic: OUTBOX_TOPIC.LOGISTICS_PARCEL_LOST, aggregateId: shipment.id },
    });
    expect(queuedLoss).not.toBeNull();

    await logisticsLostParcelService.settleLostParcel(shipment.id);
    await logisticsLostParcelService.settleLostParcel(shipment.id);

    const refunds = await prisma.orderRefund.findMany({ where: { orderId: order.id } });
    expect(refunds).toEqual([
      expect.objectContaining({
        cause: OrderRefundCause.PARTNER_FAILED,
        totalAmount: SHIRT_PRICE + JACKET_PRICE + DELIVERY_FEE,
      }),
    ]);
    const parcel = await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
    expect(parcel).toMatchObject({
      partnerClaimStatus: PartnerClaimStatus.OPEN,
      partnerClaimAmount: SHIRT_PRICE + JACKET_PRICE,
    });
  });
});
