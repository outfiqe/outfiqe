import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PartnerWebhookVerification } from "#generated/prisma/enums.js";

import { signPartnerWebhookBody } from "../../partner-webhooks/partner-webhook.signature.js";
import {
  createHttpJsonAdapter,
  HTTP_JSON_SIGNATURE_HEADER,
  HTTP_JSON_TOKEN_HEADER,
} from "./http-json.adapter.js";
import type {
  DeliveryPartnerAccountConfig,
  PartnerBookingRequest,
} from "./partner-adapter.types.js";
import { PartnerRequestError } from "./partner-request.error.js";

const CREDENTIALS_KEY = "VALLEY_TEST";
const API_KEY = "api-key-0123456789abcdef";
const WEBHOOK_SECRET = "webhook-secret-0123456789";
const BASE_URL = "https://partner.example/api";

const readFixture = (name: string): string =>
  readFileSync(fileURLToPath(new URL(`./fixtures/http-json/${name}`, import.meta.url)), "utf8");

const jsonReply = (body: string, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "application/json" } });

const account: DeliveryPartnerAccountConfig = {
  accountId: "account-1",
  partnerId: "partner-1",
  partnerCode: "valley",
  hubId: "hub-1",
  merchantAccountRef: "OUTFIQE-01",
  pickupPointRef: "KTM-HUB",
  credentialsKey: CREDENTIALS_KEY,
};

const bookingRequest: PartnerBookingRequest = {
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
      landmark: null,
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
  contentsDescription: "Clothing",
};

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv(`DELIVERY_PARTNER_${CREDENTIALS_KEY}_API_KEY`, API_KEY);
  vi.stubEnv(`DELIVERY_PARTNER_${CREDENTIALS_KEY}_BASE_URL`, BASE_URL);
  vi.stubEnv(`DELIVERY_PARTNER_${CREDENTIALS_KEY}_WEBHOOK_SECRET`, WEBHOOK_SECRET);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("HTTP JSON partner adapter", () => {
  it("books a parcel under our merchant account and reads the partner's reference", async () => {
    fetchMock.mockResolvedValue(jsonReply(readFixture("booked-shipment.json"), 201));

    const booking = await createHttpJsonAdapter(account).createShipment?.(bookingRequest);

    expect(booking).toEqual({
      partnerReference: "PX-55821",
      labelUrl: "https://partner.example/labels/PX-55821.pdf",
      partnerTrackingUrl: "https://partner.example/track/PX-55821",
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://partner.example/api/shipments");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe(`Bearer ${API_KEY}`);
    expect(JSON.parse(String(init?.body))).toMatchObject({
      merchantReference: "OFQ7K2M9QAB",
      idempotencyKey: "booking-1",
      merchantAccount: "OUTFIQE-01",
      pickupPoint: "KTM-HUB",
    });
  });

  it("finds an existing booking by our parcel code, or nothing", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonReply(readFixture("shipment-search.json")))
      .mockResolvedValueOnce(jsonReply("{}", 404));
    const adapter = createHttpJsonAdapter(account);

    await expect(adapter.findShipment?.("OFQ7K2M9QAB")).resolves.toMatchObject({
      partnerReference: "PX-55821",
    });
    await expect(adapter.findShipment?.("OFQ0000AAAA")).resolves.toBeNull();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://partner.example/api/shipments?merchantReference=OFQ7K2M9QAB",
    );
  });

  it("turns the partner's tracking history into our events", async () => {
    fetchMock.mockResolvedValue(jsonReply(readFixture("tracking-events.json")));

    const events = await createHttpJsonAdapter(account).fetchTrackingEvents?.(
      "PX-55821",
      new Date("2026-10-16T00:00:00.000Z"),
    );

    expect(events).toEqual([
      expect.objectContaining({
        partnerReference: "PX-55821",
        partnerEventId: "evt-1001",
        rawStatus: "In Transit",
        occurredAt: new Date("2026-10-16T03:30:00.000Z"),
        location: "Kathmandu sorting centre",
      }),
      expect.objectContaining({
        partnerEventId: "evt-1002",
        rawStatus: "Delivered",
        codCollectedAmount: 2400,
      }),
    ]);
  });

  it("checks the webhook signature and reads the update", () => {
    const rawBody = Buffer.from(readFixture("webhook-delivered.json"));
    const adapter = createHttpJsonAdapter(account);

    const signedHeaders = {
      [HTTP_JSON_SIGNATURE_HEADER]: signPartnerWebhookBody(rawBody, WEBHOOK_SECRET),
    };

    expect(
      adapter.verifyWebhook?.(signedHeaders, rawBody, PartnerWebhookVerification.SIGNATURE),
    ).toBe(true);
    expect(
      adapter.verifyWebhook?.(
        { [HTTP_JSON_SIGNATURE_HEADER]: "forged" },
        rawBody,
        PartnerWebhookVerification.SIGNATURE,
      ),
    ).toBe(false);
    expect(adapter.verifyWebhook?.(signedHeaders, rawBody, PartnerWebhookVerification.NONE)).toBe(
      false,
    );
    expect(adapter.parseWebhook?.(rawBody)).toEqual([
      expect.objectContaining({
        partnerReference: "PX-55821",
        merchantReference: "OFQ7K2M9QAB",
        rawStatus: "Delivered",
      }),
    ]);
  });

  it("accepts a partner that sends the shared secret as a header token instead", () => {
    const rawBody = Buffer.from(readFixture("webhook-delivered.json"));
    const adapter = createHttpJsonAdapter(account);

    expect(
      adapter.verifyWebhook?.(
        { [HTTP_JSON_TOKEN_HEADER]: WEBHOOK_SECRET },
        rawBody,
        PartnerWebhookVerification.HEADER_TOKEN,
      ),
    ).toBe(true);
    expect(
      adapter.verifyWebhook?.(
        { [HTTP_JSON_TOKEN_HEADER]: "wrong-secret-0123456789" },
        rawBody,
        PartnerWebhookVerification.HEADER_TOKEN,
      ),
    ).toBe(false);
    expect(
      adapter.verifyWebhook?.(
        { [HTTP_JSON_TOKEN_HEADER]: WEBHOOK_SECRET },
        rawBody,
        PartnerWebhookVerification.SIGNATURE,
      ),
    ).toBe(false);
  });

  it("says whether a failure is worth retrying", async () => {
    const adapter = createHttpJsonAdapter(account);

    fetchMock.mockResolvedValueOnce(jsonReply("{}", 503));
    await expect(adapter.createShipment?.(bookingRequest)).rejects.toMatchObject({
      isRetryable: true,
    });
    fetchMock.mockResolvedValueOnce(jsonReply('{"error":"bad city"}', 422));
    await expect(adapter.createShipment?.(bookingRequest)).rejects.toMatchObject({
      isRetryable: false,
    });
    fetchMock.mockRejectedValueOnce(new Error("socket hang up"));
    await expect(adapter.createShipment?.(bookingRequest)).rejects.toBeInstanceOf(
      PartnerRequestError,
    );
    fetchMock.mockResolvedValueOnce(jsonReply('{"unexpected":true}', 201));
    await expect(adapter.createShipment?.(bookingRequest)).rejects.toMatchObject({
      isRetryable: false,
    });
  });

  it("refuses to call the partner when its secrets aren't set", async () => {
    vi.unstubAllEnvs();

    await expect(
      createHttpJsonAdapter(account).createShipment?.(bookingRequest),
    ).rejects.toMatchObject({ isRetryable: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
