import { z } from "zod";

import { readDeliveryPartnerCredentials } from "#config/delivery-partner.config.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { PartnerWebhookVerification } from "#generated/prisma/enums.js";

import {
  isValidPartnerSignature,
  isValidPartnerToken,
} from "../../partner-webhooks/partner-webhook.signature.js";
import type {
  CreateDeliveryPartnerAdapter,
  PartnerBookingRequest,
  PartnerBookingResult,
  PartnerTrackingEvent,
} from "./partner-adapter.types.js";
import { PartnerRequestError } from "./partner-request.error.js";

export const HTTP_JSON_ADAPTER_KEY = "HTTP_JSON";

export const HTTP_JSON_SIGNATURE_HEADER = "x-partner-signature";

export const HTTP_JSON_TOKEN_HEADER = "x-partner-token";

const REQUEST_TIMEOUT_MS = 10_000;
const SHIPMENTS_PATH = "shipments";
const JSON_CONTENT_TYPE = "application/json";

const bookedShipmentSchema = z.object({
  reference: z.string().min(1),
  merchantReference: z.string().optional(),
  labelUrl: z.url().nullable().optional(),
  trackingUrl: z.url().nullable().optional(),
});

const shipmentSearchSchema = z.object({ shipments: z.array(bookedShipmentSchema) });

const partnerEventSchema = z.object({
  id: z.string().min(1).nullable().optional(),
  reference: z.string().min(1).nullable().optional(),
  merchantReference: z.string().min(1).nullable().optional(),
  status: z.string().min(1),
  occurredAt: z.iso.datetime({ offset: true }),
  location: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  codCollected: z.number().int().min(0).nullable().optional(),
});

const partnerEventsSchema = z.object({ events: z.array(partnerEventSchema) });

const toBookingResult = (shipment: z.infer<typeof bookedShipmentSchema>): PartnerBookingResult => ({
  partnerReference: shipment.reference,
  labelUrl: shipment.labelUrl ?? null,
  partnerTrackingUrl: shipment.trackingUrl ?? null,
});

const toTrackingEvent = (
  event: z.infer<typeof partnerEventSchema>,
  fallbackReference: string | null,
): PartnerTrackingEvent => ({
  partnerReference: event.reference ?? fallbackReference,
  merchantReference: event.merchantReference ?? null,
  partnerEventId: event.id ?? null,
  rawStatus: event.status,
  occurredAt: new Date(event.occurredAt),
  location: event.location ?? null,
  rawReason: event.reason ?? null,
  codCollectedAmount: event.codCollected ?? null,
  rawPayload: event,
});

const isServerError = (status: number) => status >= HTTP_STATUS.INTERNAL_SERVER_ERROR;

const parseJsonBody = (rawBody: Buffer): unknown => {
  try {
    const parsedBody: unknown = JSON.parse(rawBody.toString("utf8"));
    return parsedBody;
  } catch {
    throw new PartnerRequestError("The partner's update isn't valid JSON.", false);
  }
};

const UNSUPPORTED_VERIFICATION_IS_VALID = false;

const createPartnerCaller =
  ({
    apiKey,
    baseUrl,
  }: Pick<ReturnType<typeof readDeliveryPartnerCredentials>, "apiKey" | "baseUrl">) =>
  async (path: string, init: RequestInit = {}): Promise<unknown> => {
    if (!apiKey || !baseUrl) {
      throw new PartnerRequestError("This partner's API key or address isn't set.", false);
    }
    let response: Response;
    try {
      response = await fetch(new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`), {
        ...init,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": JSON_CONTENT_TYPE,
          Accept: JSON_CONTENT_TYPE,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new PartnerRequestError("The partner didn't answer in time.", true);
    }
    if (response.status === HTTP_STATUS.NOT_FOUND) return null;
    if (!response.ok) {
      throw new PartnerRequestError(
        `The partner answered ${response.status}.`,
        isServerError(response.status),
      );
    }
    const replyBody: unknown = await response.json();
    return replyBody;
  };

const parseReply = <Shape>(schema: z.ZodType<Shape>, reply: unknown): Shape => {
  const parsed = schema.safeParse(reply);
  if (!parsed.success) {
    throw new PartnerRequestError("The partner's reply wasn't in the expected shape.", false);
  }
  return parsed.data;
};

export const createHttpJsonAdapter: CreateDeliveryPartnerAdapter = (account) => {
  const { apiKey, baseUrl, webhookSecret, previousWebhookSecret } = readDeliveryPartnerCredentials(
    account.credentialsKey,
  );
  const callPartner = createPartnerCaller({ apiKey, baseUrl });

  return {
    isManual: false,

    async createShipment(request: PartnerBookingRequest): Promise<PartnerBookingResult> {
      const reply = await callPartner(SHIPMENTS_PATH, {
        method: "POST",
        body: JSON.stringify({
          ...request,
          merchantAccount: account.merchantAccountRef,
          pickupPoint: account.pickupPointRef,
        }),
      });
      return toBookingResult(parseReply(bookedShipmentSchema, reply));
    },

    async findShipment(merchantReference: string): Promise<PartnerBookingResult | null> {
      const reply = await callPartner(
        `${SHIPMENTS_PATH}?merchantReference=${encodeURIComponent(merchantReference)}`,
      );
      if (reply === null) return null;
      const [shipment] = parseReply(shipmentSearchSchema, reply).shipments;
      return shipment ? toBookingResult(shipment) : null;
    },

    async cancelShipment(partnerReference: string): Promise<void> {
      await callPartner(`${SHIPMENTS_PATH}/${encodeURIComponent(partnerReference)}`, {
        method: "DELETE",
      });
    },

    async updateCodAmount(partnerReference: string, codAmount: number): Promise<void> {
      await callPartner(`${SHIPMENTS_PATH}/${encodeURIComponent(partnerReference)}`, {
        method: "PATCH",
        body: JSON.stringify({ codAmount }),
      });
    },

    async fetchTrackingEvents(
      partnerReference: string,
      since: Date,
    ): Promise<PartnerTrackingEvent[]> {
      const reply = await callPartner(
        `${SHIPMENTS_PATH}/${encodeURIComponent(partnerReference)}/events?since=${encodeURIComponent(since.toISOString())}`,
      );
      if (reply === null) return [];
      return parseReply(partnerEventsSchema, reply).events.map((event) =>
        toTrackingEvent(event, partnerReference),
      );
    },

    verifyWebhook(
      headers: Record<string, string>,
      rawBody: Buffer,
      verification: PartnerWebhookVerification,
    ): boolean {
      const webhookSecrets = [webhookSecret, previousWebhookSecret];
      if (verification === PartnerWebhookVerification.HEADER_TOKEN) {
        return isValidPartnerToken(headers[HTTP_JSON_TOKEN_HEADER], webhookSecrets);
      }
      if (verification === PartnerWebhookVerification.SIGNATURE) {
        return isValidPartnerSignature(
          rawBody,
          headers[HTTP_JSON_SIGNATURE_HEADER],
          webhookSecrets,
        );
      }
      return UNSUPPORTED_VERIFICATION_IS_VALID;
    },

    parseWebhook(rawBody: Buffer): PartnerTrackingEvent[] {
      const parsed = partnerEventsSchema.safeParse(parseJsonBody(rawBody));
      if (!parsed.success) {
        throw new PartnerRequestError("The partner's update wasn't in the expected shape.", false);
      }
      return parsed.data.events.map((event) => toTrackingEvent(event, null));
    },
  };
};
