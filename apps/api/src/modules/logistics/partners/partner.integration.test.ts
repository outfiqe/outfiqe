import { randomUUID } from "node:crypto";

import { subHours } from "date-fns/subHours";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS, IDEMPOTENCY_HEADER } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  PartnerStatusImportRowOutcome,
  PaymentMethod,
  PaymentStatus,
  ShipmentStatus,
  TrackingEventCode,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createRoleLimitedStaffSession } from "#test/integration/auth-helpers.js";
import {
  createOrderOnItsWayToHub,
  createStaffForHub,
} from "#test/integration/hub-operation-fixtures.js";
import { createCoveredPickupArea, createHub } from "#test/integration/logistics-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

const PARTNERS_PATH = "/api/logistics/admin/partners";
const HUB_PATH = "/api/logistics/hub";

const partnerBody = (overrides: Record<string, unknown> = {}) => ({
  code: `courier-${randomUUID().slice(0, 6)}`,
  name: "Valley Courier",
  countryCode: "NP",
  adapterKey: "MANUAL",
  ...overrides,
});

const createPartner = (authHeader: string, overrides: Record<string, unknown> = {}) =>
  request(testApp)
    .post(PARTNERS_PATH)
    .set("Authorization", authHeader)
    .send(partnerBody(overrides));

const uploadSheet = (authHeader: string, partnerId: string, csv: string) =>
  request(testApp)
    .post(`${PARTNERS_PATH}/${partnerId}/status-imports`)
    .set("Authorization", authHeader)
    .send({ fileName: "statuses.csv", csv });

const shipParcelWithPartner = async () => {
  const setup = await createOrderOnItsWayToHub({
    paymentMethod: PaymentMethod.KHALTI,
    paymentStatus: PaymentStatus.PAID,
    lines: [{ unitPrice: 500, qty: 1 }],
  });
  const { hub, staff, pickups, order } = setup;
  for (const { bagTagCode, qty } of pickups) {
    await request(testApp)
      .post(`${HUB_PATH}/check-ins`)
      .set("Authorization", staff.authHeader)
      .set(IDEMPOTENCY_HEADER, randomUUID())
      .send({ hubId: hub.id, code: bagTagCode, countedUnits: qty });
  }
  const packed = await request(testApp)
    .post(`${HUB_PATH}/orders/${order.id}/parcels`)
    .set("Authorization", staff.authHeader)
    .send({ weightGrams: 500, parcelCount: 1 });
  const { shipmentId, trackingCode } = packed.body.data;
  await request(testApp)
    .post(`${HUB_PATH}/shipments/${shipmentId}/booking`)
    .set("Authorization", staff.authHeader)
    .send({ partnerReference: "PX-100" });
  await request(testApp)
    .post(`${HUB_PATH}/shipments/${shipmentId}/label-printed`)
    .set("Authorization", staff.authHeader);
  await request(testApp)
    .post(`${HUB_PATH}/handovers`)
    .set("Authorization", staff.authHeader)
    .set(IDEMPOTENCY_HEADER, randomUUID())
    .send({ hubId: hub.id, code: trackingCode });
  return { ...setup, shipmentId, trackingCode };
};

beforeEach(async () => {
  await redis.flushdb();
});

describe("delivery partner setup", () => {
  it("adds a partner, its merchant account, delivery areas and status names", async () => {
    const staff = await createStaffForHub();
    const { hub, zone } = await createCoveredPickupArea(["Kathmandu"]);

    const created = await createPartner(staff.authHeader, { referencePattern: "PX-\\d+" });
    const partnerId = created.body.data.id;
    const account = await request(testApp)
      .put(`${PARTNERS_PATH}/${partnerId}/accounts/${hub.id}`)
      .set("Authorization", staff.authHeader)
      .send({ merchantAccountRef: "OUTFIQE-01", credentialsKey: "VALLEY_KTM" });
    const zones = await request(testApp)
      .put(`${PARTNERS_PATH}/${partnerId}/zones`)
      .set("Authorization", staff.authHeader)
      .send({ hubId: hub.id, zones: [{ deliveryZoneId: zone.id, priority: 1 }] });
    const statusMap = await request(testApp)
      .put(`${PARTNERS_PATH}/${partnerId}/status-map`)
      .set("Authorization", staff.authHeader)
      .send({
        mappings: [{ rawStatus: " delivered ", canonicalCode: TrackingEventCode.DELIVERED }],
      });

    expect(created.status).toBe(HTTP_STATUS.CREATED);
    expect(created.body.data).toMatchObject({
      adapterKey: "MANUAL",
      supportsBooking: false,
      supportsWebhooks: false,
    });
    expect(account.body.data.accounts).toEqual([
      expect.objectContaining({ hubId: hub.id, merchantAccountRef: "OUTFIQE-01" }),
    ]);
    expect(zones.body.data.zones).toEqual([
      expect.objectContaining({ deliveryZoneId: zone.id, priority: 1 }),
    ]);
    expect(statusMap.body.data.statusMappings).toEqual([
      { rawStatus: "DELIVERED", canonicalCode: TrackingEventCode.DELIVERED, reasonCode: null },
    ]);
  });

  it("refuses an unknown connection, a broken pattern, a taken code and areas without an account", async () => {
    const staff = await createStaffForHub();
    const { hub, zone } = await createCoveredPickupArea(["Kathmandu"]);
    const code = `courier-${randomUUID().slice(0, 6)}`;

    const unknownAdapter = await createPartner(staff.authHeader, { adapterKey: "NOPE" });
    const brokenPattern = await createPartner(staff.authHeader, { referencePattern: "PX-(" });
    await createPartner(staff.authHeader, { code });
    const takenCode = await createPartner(staff.authHeader, { code });
    const partnerId = (await createPartner(staff.authHeader)).body.data.id;
    const zonesWithoutAccount = await request(testApp)
      .put(`${PARTNERS_PATH}/${partnerId}/zones`)
      .set("Authorization", staff.authHeader)
      .send({ hubId: hub.id, zones: [{ deliveryZoneId: zone.id, priority: 0 }] });

    expect(unknownAdapter.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(brokenPattern.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(takenCode.status).toBe(HTTP_STATUS.CONFLICT);
    expect(zonesWithoutAccount.body.code).toBe("PARTNER_HAS_NO_ACCOUNT_AT_HUB");
  });

  it("keeps a partner's setup to its own country and to staff who manage logistics", async () => {
    const staff = await createStaffForHub();
    const viewer = await createRoleLimitedStaffSession("platform:logistics:read");
    const indianHub = await prisma.hub.update({
      where: { id: (await createHub()).id },
      data: { countryCode: "IN" },
    });
    const partnerId = (await createPartner(staff.authHeader)).body.data.id;

    const otherCountry = await request(testApp)
      .put(`${PARTNERS_PATH}/${partnerId}/accounts/${indianHub.id}`)
      .set("Authorization", staff.authHeader)
      .send({ merchantAccountRef: "X" });
    const viewerList = await request(testApp)
      .get(PARTNERS_PATH)
      .set("Authorization", viewer.authHeader);
    const viewerWrite = await createPartner(viewer.authHeader);

    expect(otherCountry.body.code).toBe("HUB_NOT_IN_PARTNER_COUNTRY");
    expect(viewerList.status).toBe(HTTP_STATUS.OK);
    expect(viewerWrite.status).toBe(HTTP_STATUS.FORBIDDEN);
  });
});

describe("partner status sheets", () => {
  it("reports every row: applied, already recorded, unknown parcel, unknown status and bad rows", async () => {
    const { partner, staff, shipmentId, trackingCode } = await shipParcelWithPartner();
    const now = new Date().toISOString();
    const earlier = subHours(new Date(), 30).toISOString();
    const csv = [
      "partnerReference,merchantReference,status,time,reason",
      `PX-100,,In transit,${now},`,
      `,${trackingCode},In transit,${now},`,
      `PX-999,,Delivered,${now},`,
      `PX-100,,Held at depot,${now},Waiting for customer`,
      `PX-100,,Delivered,not-a-time,`,
      `PX-100,,Out for delivery,${earlier},`,
    ].join("\n");

    const imported = await uploadSheet(staff.authHeader, partner.id, csv);

    expect(imported.status).toBe(HTTP_STATUS.CREATED);
    expect(imported.body.data.rows.map(({ outcome }: { outcome: string }) => outcome)).toEqual([
      PartnerStatusImportRowOutcome.APPLIED,
      PartnerStatusImportRowOutcome.DUPLICATE,
      PartnerStatusImportRowOutcome.UNMATCHED_REFERENCE,
      PartnerStatusImportRowOutcome.UNKNOWN_STATUS,
      PartnerStatusImportRowOutcome.INVALID_ROW,
      PartnerStatusImportRowOutcome.NOT_APPLIED,
    ]);
    expect(imported.body.data).toMatchObject({ rowCount: 6, appliedCount: 1 });
    expect((await prisma.shipment.findUniqueOrThrow({ where: { id: shipmentId } })).status).toBe(
      ShipmentStatus.IN_TRANSIT,
    );

    const reread = await request(testApp)
      .get(`${PARTNERS_PATH}/${partner.id}/status-imports/${imported.body.data.id}`)
      .set("Authorization", staff.authHeader);
    expect(reread.body.data.rows).toHaveLength(6);
  });

  it("applies an uploaded sheet once, however many times it is uploaded", async () => {
    const { partner, staff, shipmentId } = await shipParcelWithPartner();
    const csv = `Partner ID,Status,Time\nPX-100,Delivered,${new Date().toISOString()}\n`;

    const first = await uploadSheet(staff.authHeader, partner.id, csv);
    const second = await uploadSheet(staff.authHeader, partner.id, csv);

    expect(first.body.data.appliedCount).toBe(1);
    expect(second.body.data.rows[0].outcome).toBe(PartnerStatusImportRowOutcome.DUPLICATE);
    expect(
      await prisma.trackingEvent.count({
        where: { shipmentId, code: TrackingEventCode.DELIVERED },
      }),
    ).toBe(1);
  });

  it("refuses a sheet without the needed columns", async () => {
    const { partner, staff } = await shipParcelWithPartner();

    const refused = await uploadSheet(staff.authHeader, partner.id, "name,notes\nA,B\n");

    expect(refused.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(refused.body.code).toBe("INVALID_STATUS_SHEET");
  });
});
