import { randomUUID } from "node:crypto";

import { subDays } from "date-fns/subDays";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  FulfilmentMode,
  FulfilmentStatus,
  PartnerStatusImportRowOutcome,
  PaymentStatus,
  TrackingEventCode,
  TrackingEventSource,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSessionWithPlatformPermissions } from "#test/integration/auth-helpers.js";
import { createCashParcelWithPartner, createCodPartner } from "#test/integration/cod-fixtures.js";
import { createBrand } from "#test/integration/crm-access-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import { logisticsPartnerEvents } from "../logistics.partner-events.js";

const COD_PATH = "/api/logistics/admin/cod";
const HUB_SHIPMENTS_PATH = "/api/logistics/hub/shipments";
const PARTNER_FEE = 100;
const CASH_SHORTFALL = 50;
const DAYS_PAST_REMITTANCE_LIMIT = 8;
const BANK_REFERENCE = "BANK-001";
const NO_PARTNER_FEE = 0;

const deliverThroughPartner = (
  partnerId: string,
  partnerReference: string,
  codCollectedAmount: number | null,
) =>
  logisticsPartnerEvents.applyPartnerTrackingEvent(partnerId, TrackingEventSource.PARTNER_IMPORT, {
    partnerReference,
    merchantReference: null,
    partnerEventId: null,
    rawStatus: "DELIVERED",
    occurredAt: new Date(),
    location: null,
    rawReason: null,
    codCollectedAmount,
    rawPayload: { status: "DELIVERED" },
  });

const findOrder = (orderId: string) => prisma.order.findUniqueOrThrow({ where: { id: orderId } });
const findShipment = (shipmentId: string) =>
  prisma.shipment.findUniqueOrThrow({ where: { id: shipmentId } });

const createDeliveredCashParcel = async (partnerId: string) => {
  const parcel = await createCashParcelWithPartner(partnerId);
  await deliverThroughPartner(partnerId, parcel.partnerReference, parcel.order.total);
  return parcel;
};

const recordRemittance = (
  authHeader: string,
  body: {
    partnerId: string;
    reference: string;
    receivedAmount: number;
    lines: { shipmentId: string; partnerFeeAmount: number }[];
  },
) =>
  request(testApp)
    .post(`${COD_PATH}/remittances`)
    .set("Authorization", authHeader)
    .send({ ...body, receivedAt: new Date().toISOString() });

beforeEach(async () => {
  await redis.flushdb();
});

describe("cash collected on delivery", () => {
  it("stores the partner's amount and marks the order paid", async () => {
    const partner = await createCodPartner();
    const { order, shipment, partnerReference } = await createCashParcelWithPartner(partner.id);

    const { outcome } = await deliverThroughPartner(partner.id, partnerReference, order.total);

    expect(outcome).toBe(PartnerStatusImportRowOutcome.APPLIED);
    expect((await findShipment(shipment.id)).codCollectedAmount).toBe(order.total);
    expect((await findOrder(order.id)).paymentStatus).toBe(PaymentStatus.PAID);
    expect(
      await prisma.trackingEvent.count({
        where: { shipmentId: shipment.id, code: TrackingEventCode.COD_COLLECTED_MISMATCH },
      }),
    ).toBe(0);
  });

  it("flags a parcel when the partner collected a different amount", async () => {
    const partner = await createCodPartner();
    const { order, shipment, partnerReference } = await createCashParcelWithPartner(partner.id);
    const collectedAmount = order.total - CASH_SHORTFALL;

    await deliverThroughPartner(partner.id, partnerReference, collectedAmount);

    expect((await findShipment(shipment.id)).codCollectedAmount).toBe(collectedAmount);
    expect(
      await prisma.trackingEvent.findFirstOrThrow({
        where: { shipmentId: shipment.id, code: TrackingEventCode.COD_COLLECTED_MISMATCH },
      }),
    ).toMatchObject({ codCollectedAmount: collectedAmount, source: TrackingEventSource.SYSTEM });
  });

  it("takes the label amount when staff mark a parcel delivered without one", async () => {
    const staff = await createAdminSessionWithPlatformPermissions("platform:logistics:manage");
    const partner = await createCodPartner();
    const { order, shipment } = await createCashParcelWithPartner(partner.id);

    const wrongCode = await request(testApp)
      .post(`${HUB_SHIPMENTS_PATH}/${shipment.id}/events`)
      .set("Authorization", staff.authHeader)
      .send({ code: TrackingEventCode.IN_TRANSIT, note: "Still moving", codCollectedAmount: 100 });
    const delivered = await request(testApp)
      .post(`${HUB_SHIPMENTS_PATH}/${shipment.id}/events`)
      .set("Authorization", staff.authHeader)
      .send({ code: TrackingEventCode.DELIVERED, note: "Partner confirmed on the phone" });

    expect(wrongCode.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(delivered.status).toBe(HTTP_STATUS.OK);
    expect(delivered.body.data.codCollectedAmount).toBe(order.total);
    expect((await findOrder(order.id)).paymentStatus).toBe(PaymentStatus.PAID);
  });

  it("leaves the order due while a brand still delivers its own part", async () => {
    const partner = await createCodPartner();
    const { order, partnerReference } = await createCashParcelWithPartner(partner.id);
    const brand = await createBrand(`Ships Itself ${randomUUID()}`);
    await prisma.orderFulfilmentGroup.create({
      data: {
        orderId: order.id,
        brandId: brand.id,
        fulfilmentMode: FulfilmentMode.BRAND_SHIPS,
        status: FulfilmentStatus.DELIVERED,
      },
    });

    await deliverThroughPartner(partner.id, partnerReference, order.total);

    expect(await findOrder(order.id)).toMatchObject({
      fulfilmentStatus: FulfilmentStatus.DELIVERED,
      paymentStatus: PaymentStatus.DUE,
    });
  });
});

describe("partner cash report and payments", () => {
  it("lists unpaid-in parcels, flags overdue ones and records a payment once", async () => {
    const staff = await createAdminSessionWithPlatformPermissions("platform:logistics:manage");
    const partner = await createCodPartner();
    const recent = await createDeliveredCashParcel(partner.id);
    const overdue = await createDeliveredCashParcel(partner.id);
    await prisma.shipment.update({
      where: { id: overdue.shipment.id },
      data: { deliveredAt: subDays(new Date(), DAYS_PAST_REMITTANCE_LIMIT) },
    });
    const parcelCash = recent.order.total + overdue.order.total;

    const summary = await request(testApp)
      .get(`${COD_PATH}/summary`)
      .set("Authorization", staff.authHeader);
    const overdueOnly = await request(testApp)
      .get(`${COD_PATH}/parcels`)
      .query({ partnerId: partner.id, onlyOverdue: "true" })
      .set("Authorization", staff.authHeader);

    expect(summary.body.data.partners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          partnerId: partner.id,
          unremittedParcelCount: 2,
          unremittedAmount: parcelCash,
          overdueParcelCount: 1,
          overdueAmount: overdue.order.total,
        }),
      ]),
    );
    expect(overdueOnly.body.data.items).toEqual([
      expect.objectContaining({ shipmentId: overdue.shipment.id, isOverdue: true }),
    ]);

    const lines = [recent, overdue].map(({ shipment }) => ({
      shipmentId: shipment.id,
      partnerFeeAmount: PARTNER_FEE,
    }));
    const wrongTotal = await recordRemittance(staff.authHeader, {
      partnerId: partner.id,
      reference: BANK_REFERENCE,
      receivedAmount: parcelCash,
      lines,
    });
    const recorded = await recordRemittance(staff.authHeader, {
      partnerId: partner.id,
      reference: BANK_REFERENCE,
      receivedAmount: parcelCash - PARTNER_FEE * lines.length,
      lines,
    });
    const sameReference = await recordRemittance(staff.authHeader, {
      partnerId: partner.id,
      reference: BANK_REFERENCE,
      receivedAmount: parcelCash - PARTNER_FEE * lines.length,
      lines,
    });
    const parcelsAfter = await request(testApp)
      .get(`${COD_PATH}/parcels`)
      .query({ partnerId: partner.id })
      .set("Authorization", staff.authHeader);
    const remittances = await request(testApp)
      .get(`${COD_PATH}/remittances`)
      .query({ partnerId: partner.id })
      .set("Authorization", staff.authHeader);

    expect(wrongTotal.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(recorded.status).toBe(HTTP_STATUS.CREATED);
    expect(recorded.body.data).toMatchObject({
      collectedAmount: parcelCash,
      partnerFeeAmount: PARTNER_FEE * lines.length,
      parcelCount: lines.length,
    });
    expect(sameReference.status).toBe(HTTP_STATUS.CONFLICT);
    expect(parcelsAfter.body.data.items).toEqual([]);
    expect(remittances.body.data.items).toEqual([
      expect.objectContaining({ id: recorded.body.data.id, reference: BANK_REFERENCE }),
    ]);
  });

  it("counts a parcel in only one payment when two are recorded at once", async () => {
    const staff = await createAdminSessionWithPlatformPermissions("platform:logistics:manage");
    const partner = await createCodPartner();
    const { order, shipment } = await createDeliveredCashParcel(partner.id);
    const payment = {
      partnerId: partner.id,
      receivedAmount: order.total,
      lines: [{ shipmentId: shipment.id, partnerFeeAmount: NO_PARTNER_FEE }],
    };

    const responses = await Promise.all([
      recordRemittance(staff.authHeader, { ...payment, reference: "BANK-A" }),
      recordRemittance(staff.authHeader, { ...payment, reference: "BANK-B" }),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([
      HTTP_STATUS.CREATED,
      HTTP_STATUS.CONFLICT,
    ]);
    expect(await prisma.codRemittanceLine.count({ where: { shipmentId: shipment.id } })).toBe(1);
  });

  it("won't take parcels from another partner or ones not delivered yet", async () => {
    const staff = await createAdminSessionWithPlatformPermissions("platform:logistics:manage");
    const partner = await createCodPartner();
    const otherPartner = await createCodPartner();
    const otherPartnersParcel = await createDeliveredCashParcel(otherPartner.id);
    const notDelivered = await createCashParcelWithPartner(partner.id);

    const response = await recordRemittance(staff.authHeader, {
      partnerId: partner.id,
      reference: "BANK-X",
      receivedAmount: otherPartnersParcel.order.total + notDelivered.order.total,
      lines: [otherPartnersParcel, notDelivered].map(({ shipment }) => ({
        shipmentId: shipment.id,
        partnerFeeAmount: NO_PARTNER_FEE,
      })),
    });

    expect(response.status).toBe(HTTP_STATUS.CONFLICT);
    expect(response.body.code).toBe("PARCELS_NOT_REMITTABLE");
  });
});
