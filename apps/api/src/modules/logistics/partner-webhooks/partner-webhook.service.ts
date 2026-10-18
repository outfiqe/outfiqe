import { subDays } from "date-fns/subDays";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  PartnerStatusImportRowOutcome,
  PartnerWebhookVerification,
  TrackingEventSource,
} from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { enqueueOutboxEvent } from "#outbox/outbox.service.js";
import { describeError } from "#redis/redis.utils.js";

import { logisticsPartnerAdapters } from "../logistics.partner-adapters.js";
import { logisticsPartnerEvents } from "../logistics.partner-events.js";
import type { PartnerTrackingEvent } from "../partners/adapters/partner-adapter.types.js";
import { PartnerRequestError } from "../partners/adapters/partner-request.error.js";
import { logisticsPartnerWebhookRepository } from "./partner-webhook.repository.js";
import type {
  ListWebhookReceiptsQuery,
  ReplayWebhookReceiptsBody,
} from "./partner-webhook.schemas.js";
import type { PartnerWebhookReceiptView, WebhookReceiveOutcome } from "./partner-webhook.types.js";

const NOTIFY_THEN_FETCH_LOOKBACK_DAYS = 14;
const MAX_REPLAYED_RECEIPTS = 200;
const NO_EVENTS = 0;
const EVENT_COUNT_STEP = 1;
const MAX_STORED_ERROR_LENGTH = 500;
const UNEXPECTED_PROCESSING_ERROR = "Something went wrong while reading this update.";
const UNVERIFIED_BODY_NOT_KEPT = "";
const RECEIPT_RETENTION_DAYS = 90;

type PartnerForWebhook = NonNullable<
  Awaited<ReturnType<typeof logisticsPartnerWebhookRepository.findPartnerById>>
>;

const TRUSTED_VERIFICATIONS: ReadonlySet<PartnerWebhookVerification> = new Set([
  PartnerWebhookVerification.SIGNATURE,
  PartnerWebhookVerification.HEADER_TOKEN,
]);

const partnerNotListeningError = () =>
  new AppError("PARTNER_WEBHOOK_NOT_FOUND", "Not found.", HTTP_STATUS.NOT_FOUND);

const adaptersFor = (partner: PartnerForWebhook) =>
  partner.accounts.map((account) => logisticsPartnerAdapters.forAccount(partner, account));

const isGenuineWebhook = (
  partner: PartnerForWebhook,
  headers: Record<string, string>,
  rawBody: Buffer,
): boolean => {
  if (partner.webhookVerification === PartnerWebhookVerification.NOTIFY_THEN_FETCH) return true;
  const { webhookVerification } = partner;
  if (!TRUSTED_VERIFICATIONS.has(webhookVerification)) return false;
  return adaptersFor(partner).some(
    (adapter) => adapter.verifyWebhook?.(headers, rawBody, webhookVerification) ?? false,
  );
};

const fetchNotifiedEvents = async (
  partner: PartnerForWebhook,
  notifiedEvents: readonly PartnerTrackingEvent[],
): Promise<PartnerTrackingEvent[]> => {
  const partnerReferences = [
    ...new Set(
      notifiedEvents.flatMap(({ partnerReference }) =>
        partnerReference ? [partnerReference] : [],
      ),
    ),
  ];
  const [adapter] = adaptersFor(partner);
  if (!adapter?.fetchTrackingEvents) return [];
  const since = subDays(new Date(), NOTIFY_THEN_FETCH_LOOKBACK_DAYS);
  const fetchedEvents: PartnerTrackingEvent[] = [];
  for (const partnerReference of partnerReferences) {
    fetchedEvents.push(...(await adapter.fetchTrackingEvents(partnerReference, since)));
  }
  return fetchedEvents;
};

const readReceiptEvents = async (
  partner: PartnerForWebhook,
  rawBody: Buffer,
): Promise<PartnerTrackingEvent[]> => {
  const [adapter] = adaptersFor(partner);
  const parsedEvents = adapter?.parseWebhook?.(rawBody) ?? [];
  return partner.webhookVerification === PartnerWebhookVerification.NOTIFY_THEN_FETCH
    ? fetchNotifiedEvents(partner, parsedEvents)
    : parsedEvents;
};

const toStoredError = (error: unknown) =>
  error instanceof PartnerRequestError
    ? error.message.slice(0, MAX_STORED_ERROR_LENGTH)
    : UNEXPECTED_PROCESSING_ERROR;

const isRetryablePartnerError = (error: unknown) =>
  !(error instanceof PartnerRequestError) || error.isRetryable;

export const logisticsPartnerWebhookService = {
  async receivePartnerWebhook(
    partnerCode: string,
    headers: Record<string, string>,
    rawBody: Buffer,
  ): Promise<WebhookReceiveOutcome> {
    const partner = await logisticsPartnerWebhookRepository.findPartnerByCode(partnerCode);
    if (!partner?.isActive) throw partnerNotListeningError();

    const signatureValid = isGenuineWebhook(partner, headers, rawBody);
    await prisma.$transaction(async (tx) => {
      const receipt = await logisticsPartnerWebhookRepository.createReceipt(tx, {
        partnerId: partner.id,
        rawBody: signatureValid ? rawBody.toString("utf8") : UNVERIFIED_BODY_NOT_KEPT,
        signatureValid,
      });
      if (signatureValid) {
        await enqueueOutboxEvent(tx, {
          topic: OUTBOX_TOPIC.LOGISTICS_PARTNER_WEBHOOK_RECEIVED,
          aggregateId: receipt.id,
          payload: { receiptId: receipt.id },
        });
      }
    });
    if (!signatureValid) {
      throw new AppError("PARTNER_WEBHOOK_UNVERIFIED", "Unauthorized.", HTTP_STATUS.UNAUTHORIZED);
    }
    return { accepted: true };
  },

  async processWebhookReceipt(receiptId: string): Promise<void> {
    const receipt = await logisticsPartnerWebhookRepository.findReceipt(receiptId);
    if (!receipt?.signatureValid || receipt.processedAt) return;
    const partner = await logisticsPartnerWebhookRepository.findPartnerById(receipt.partnerId);
    if (!partner) return;

    let events: PartnerTrackingEvent[];
    try {
      events = await readReceiptEvents(partner, Buffer.from(receipt.rawBody, "utf8"));
    } catch (error) {
      logger.warn(`Partner webhook ${receiptId} can't be read: ${describeError(error)}`);
      await logisticsPartnerWebhookRepository.markReceiptFailed(receiptId, toStoredError(error));
      if (isRetryablePartnerError(error)) throw error;
      return;
    }

    let appliedCount = NO_EVENTS;
    let unknownCount = NO_EVENTS;
    for (const event of events) {
      const { outcome } = await logisticsPartnerEvents.applyPartnerTrackingEvent(
        partner.id,
        TrackingEventSource.PARTNER_WEBHOOK,
        event,
      );
      if (outcome === PartnerStatusImportRowOutcome.APPLIED) appliedCount += EVENT_COUNT_STEP;
      if (outcome === PartnerStatusImportRowOutcome.UNKNOWN_STATUS)
        unknownCount += EVENT_COUNT_STEP;
    }
    await logisticsPartnerWebhookRepository.markReceiptProcessed(receiptId, {
      eventCount: events.length,
      appliedCount,
      unknownCount,
    });
  },

  async replayWebhookReceipts(
    partnerId: string,
    { since }: ReplayWebhookReceiptsBody,
  ): Promise<{ replayedCount: number }> {
    const partner = await logisticsPartnerWebhookRepository.findPartnerById(partnerId);
    if (!partner) {
      throw new AppError("PARTNER_NOT_FOUND", "Delivery partner not found.", HTTP_STATUS.NOT_FOUND);
    }
    const receiptIds = await logisticsPartnerWebhookRepository.listReceiptIdsToReplay({
      partnerId,
      since,
      limit: MAX_REPLAYED_RECEIPTS,
    });
    await prisma.$transaction(async (tx) => {
      await logisticsPartnerWebhookRepository.clearReceiptsForReplay(tx, receiptIds);
      for (const receiptId of receiptIds) {
        await enqueueOutboxEvent(tx, {
          topic: OUTBOX_TOPIC.LOGISTICS_PARTNER_WEBHOOK_RECEIVED,
          aggregateId: receiptId,
          payload: { receiptId },
        });
      }
    });
    return { replayedCount: receiptIds.length };
  },

  async deleteOldWebhookReceipts(): Promise<void> {
    const deletedCount = await logisticsPartnerWebhookRepository.deleteReceiptsReceivedBefore(
      subDays(new Date(), RECEIPT_RETENTION_DAYS),
    );
    if (deletedCount > NO_EVENTS) logger.info(`Deleted ${deletedCount} old partner updates`);
  },

  async listWebhookReceipts(
    partnerId: string,
    { cursor, limit }: ListWebhookReceiptsQuery,
  ): Promise<{ items: PartnerWebhookReceiptView[]; nextCursor: string | null }> {
    const receipts = await logisticsPartnerWebhookRepository.listReceipts({
      partnerId,
      ...(cursor ? { cursor } : {}),
      limit,
    });
    const { items, nextCursor } = buildCursorPage(receipts, limit, (receipt) => receipt.id);
    return {
      items: items.map(({ receivedAt, processedAt, ...receipt }) => ({
        ...receipt,
        receivedAt: receivedAt.toISOString(),
        processedAt: processedAt?.toISOString() ?? null,
      })),
      nextCursor,
    };
  },
};
