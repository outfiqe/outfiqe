import { subHours } from "date-fns/subHours";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  PartnerWebhookVerification,
  ShipmentStatus,
  TrackingEventCode,
} from "#generated/prisma/enums.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { createStaffForHub } from "#test/integration/hub-operation-fixtures.js";
import {
  createParcelWithApiPartner,
  PARTNER_CREDENTIAL_ENV,
  PARTNER_WEBHOOK_SECRET,
} from "#test/integration/partner-connection-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import {
  HTTP_JSON_SIGNATURE_HEADER,
  HTTP_JSON_TOKEN_HEADER,
} from "../partners/adapters/http-json.adapter.js";
import { logisticsPartnerPollingService } from "./partner-polling.service.js";
import { logisticsPartnerWebhookService } from "./partner-webhook.service.js";
import { signPartnerWebhookBody } from "./partner-webhook.signature.js";

const WEBHOOK_PATH = "/api/webhooks/delivery-partners";
const ADMIN_PARTNERS_PATH = "/api/logistics/admin/partners";
const HOURS_SINCE_LAST_NEWS = 25;
const REPLAY_WINDOW_HOURS = 1;

const fetchMock = vi.fn<typeof fetch>();

const buildPartnerUpdate = (partnerReference: string | null, status: string, eventId: string) =>
  JSON.stringify({
    events: [
      { id: eventId, reference: partnerReference, status, occurredAt: new Date().toISOString() },
    ],
  });

const postPartnerUpdate = (partnerCode: string, body: string, headers: Record<string, string>) =>
  request(testApp)
    .post(`${WEBHOOK_PATH}/${partnerCode}`)
    .set("Content-Type", "application/json")
    .set(headers)
    .send(body);

const signedHeaders = (body: string) => ({
  [HTTP_JSON_SIGNATURE_HEADER]: signPartnerWebhookBody(Buffer.from(body), PARTNER_WEBHOOK_SECRET),
});

const processEveryReceipt = async (partnerId: string) => {
  const receipts = await prisma.partnerWebhookReceipt.findMany({
    where: { partnerId },
    orderBy: { receivedAt: "asc" },
  });
  for (const { id } of receipts) {
    await logisticsPartnerWebhookService.processWebhookReceipt(id);
  }
  return prisma.partnerWebhookReceipt.findMany({
    where: { partnerId },
    orderBy: { receivedAt: "asc" },
  });
};

beforeEach(() => {
  for (const [name, value] of Object.entries(PARTNER_CREDENTIAL_ENV)) vi.stubEnv(name, value);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("partner webhooks", () => {
  it("applies a signed partner update once, even when the partner sends it twice", async () => {
    const { partner, shipment, partnerReference } = await createParcelWithApiPartner();
    const body = buildPartnerUpdate(partnerReference, "In Transit", "evt-1");

    const firstDelivery = await postPartnerUpdate(partner.code, body, signedHeaders(body));
    const repeatDelivery = await postPartnerUpdate(partner.code, body, signedHeaders(body));
    expect(firstDelivery.status).toBe(HTTP_STATUS.OK);
    expect(repeatDelivery.status).toBe(HTTP_STATUS.OK);
    const queuedReceipts = await prisma.outboxEvent.count({
      where: { topic: OUTBOX_TOPIC.LOGISTICS_PARTNER_WEBHOOK_RECEIVED },
    });
    expect(queuedReceipts).toBe(2);

    const [firstReceipt, repeatReceipt] = await processEveryReceipt(partner.id);

    expect(firstReceipt).toMatchObject({ eventCount: 1, appliedCount: 1, unknownCount: 0 });
    expect(repeatReceipt).toMatchObject({ eventCount: 1, appliedCount: 0 });
    expect(firstReceipt?.processedAt).not.toBeNull();
    const parcel = await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
    expect(parcel.status).toBe(ShipmentStatus.IN_TRANSIT);
    expect(
      await prisma.trackingEvent.count({
        where: { shipmentId: shipment.id, code: TrackingEventCode.IN_TRANSIT },
      }),
    ).toBe(1);
  });

  it("turns away a forged update without keeping its body", async () => {
    const { partner, partnerReference } = await createParcelWithApiPartner();
    const body = buildPartnerUpdate(partnerReference, "Delivered", "evt-forged");

    const response = await postPartnerUpdate(partner.code, body, {
      [HTTP_JSON_SIGNATURE_HEADER]: "forged",
    });

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    const [receipt] = await prisma.partnerWebhookReceipt.findMany({
      where: { partnerId: partner.id },
    });
    expect(receipt).toMatchObject({ signatureValid: false, rawBody: "" });
    expect(await prisma.outboxEvent.count()).toBe(0);
  });

  it("accepts a partner that proves itself with a header token", async () => {
    const { partner, partnerReference } = await createParcelWithApiPartner({
      webhookVerification: PartnerWebhookVerification.HEADER_TOKEN,
    });
    const body = buildPartnerUpdate(partnerReference, "In Transit", "evt-token");

    const response = await postPartnerUpdate(partner.code, body, {
      [HTTP_JSON_TOKEN_HEADER]: PARTNER_WEBHOOK_SECRET,
    });

    expect(response.status).toBe(HTTP_STATUS.OK);
  });

  it("doesn't listen for an unknown or switched-off partner", async () => {
    const { partner } = await createParcelWithApiPartner();
    await prisma.deliveryPartner.update({ where: { id: partner.id }, data: { isActive: false } });
    const body = buildPartnerUpdate(null, "In Transit", "evt-off");

    expect((await postPartnerUpdate(partner.code, body, signedHeaders(body))).status).toBe(
      HTTP_STATUS.NOT_FOUND,
    );
    expect((await postPartnerUpdate("no-such-partner", body, signedHeaders(body))).status).toBe(
      HTTP_STATUS.NOT_FOUND,
    );
  });

  it("keeps updates with a status we don't know so staff can map it and replay them", async () => {
    const { partner, shipment, partnerReference } = await createParcelWithApiPartner();
    const staff = await createStaffForHub();
    const body = buildPartnerUpdate(partnerReference, "With rider", "evt-unknown");
    await postPartnerUpdate(partner.code, body, signedHeaders(body));

    const [unknownReceipt] = await processEveryReceipt(partner.id);
    expect(unknownReceipt).toMatchObject({ eventCount: 1, appliedCount: 0, unknownCount: 1 });

    await prisma.deliveryPartnerStatusMap.create({
      data: {
        partnerId: partner.id,
        rawStatus: "WITH RIDER",
        canonicalCode: TrackingEventCode.OUT_FOR_DELIVERY,
      },
    });
    const replay = await request(testApp)
      .post(`${ADMIN_PARTNERS_PATH}/${partner.id}/webhook-receipts/replay`)
      .set("Authorization", staff.authHeader)
      .send({ since: subHours(new Date(), REPLAY_WINDOW_HOURS).toISOString() });
    expect(replay.status).toBe(HTTP_STATUS.OK);
    expect(replay.body.data).toEqual({ replayedCount: 1 });

    const [replayedReceipt] = await processEveryReceipt(partner.id);
    expect(replayedReceipt).toMatchObject({ appliedCount: 1, unknownCount: 0 });
    const parcel = await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
    expect(parcel.status).toBe(ShipmentStatus.OUT_FOR_DELIVERY);

    const receiptList = await request(testApp)
      .get(`${ADMIN_PARTNERS_PATH}/${partner.id}/webhook-receipts`)
      .set("Authorization", staff.authHeader);
    expect(receiptList.status).toBe(HTTP_STATUS.OK);
    expect(receiptList.body.data.items).toEqual([
      expect.objectContaining({ signatureValid: true, appliedCount: 1 }),
    ]);
  });

  it("shows staff where the partner should send updates and which secrets are set", async () => {
    const { partner } = await createParcelWithApiPartner();
    const staff = await createStaffForHub();

    const response = await request(testApp)
      .get(`${ADMIN_PARTNERS_PATH}/${partner.id}`)
      .set("Authorization", staff.authHeader);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data.webhookUrl).toMatch(new RegExp(`${WEBHOOK_PATH}/${partner.code}$`));
    expect(response.body.data.accounts[0].credentials).toEqual({
      hasApiKey: true,
      hasBaseUrl: true,
      hasWebhookSecret: true,
      hasPreviousWebhookSecret: false,
    });
    expect(JSON.stringify(response.body)).not.toContain(PARTNER_WEBHOOK_SECRET);
  });
});

describe("partner polling", () => {
  it("asks a partner without webhooks for news, and not again until the next round", async () => {
    const { shipment, partnerReference, booking } = await createParcelWithApiPartner({
      webhookVerification: PartnerWebhookVerification.NONE,
    });
    fetchMock.mockImplementation(async () =>
      Response.json({
        events: [
          {
            id: "poll-1",
            reference: partnerReference,
            status: "Out for delivery",
            occurredAt: new Date().toISOString(),
          },
        ],
      }),
    );

    await logisticsPartnerPollingService.pollPartnerTracking();
    await logisticsPartnerPollingService.pollPartnerTracking();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const parcel = await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
    expect(parcel.status).toBe(ShipmentStatus.OUT_FOR_DELIVERY);
    const polledBooking = await prisma.shipmentPartnerBooking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(polledBooking.lastPolledAt).not.toBeNull();
  });

  it("only checks on a webhook partner's parcel once it has gone quiet for a day", async () => {
    const { shipment } = await createParcelWithApiPartner();

    await logisticsPartnerPollingService.pollPartnerTracking();
    expect(fetchMock).not.toHaveBeenCalled();

    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { lastEventAt: subHours(new Date(), HOURS_SINCE_LAST_NEWS) },
    });
    fetchMock.mockResolvedValue(Response.json({ events: [] }));
    await logisticsPartnerPollingService.pollPartnerTracking();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps going when one partner can't be reached", async () => {
    await createParcelWithApiPartner({ webhookVerification: PartnerWebhookVerification.NONE });
    fetchMock.mockRejectedValue(new Error("socket hang up"));

    await expect(logisticsPartnerPollingService.pollPartnerTracking()).resolves.toBeUndefined();
  });
});
