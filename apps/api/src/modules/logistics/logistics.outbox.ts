import { z } from "zod";

import logger from "#lib/winston.utils.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { registerOutboxHandler } from "#outbox/outbox.handlers.js";
import type { OutboxJobData } from "#outbox/outbox.types.js";

import { logisticsPartnerBookingService } from "./partner-bookings/partner-booking.service.js";
import { logisticsPartnerWebhookService } from "./partner-webhooks/partner-webhook.service.js";

const webhookReceivedSchema = z.object({ receiptId: z.uuid() });
const bookingRequestedSchema = z.object({ bookingId: z.uuid() });

export const processPartnerWebhookReceived = async ({
  outboxEventId,
  payload,
}: OutboxJobData): Promise<void> => {
  const parsed = webhookReceivedSchema.safeParse(payload);
  if (!parsed.success) {
    logger.error(`Outbox event ${outboxEventId} for a partner update is unreadable`);
    return;
  }
  await logisticsPartnerWebhookService.processWebhookReceipt(parsed.data.receiptId);
};

export const processPartnerBookingRequested = async ({
  outboxEventId,
  payload,
}: OutboxJobData): Promise<void> => {
  const parsed = bookingRequestedSchema.safeParse(payload);
  if (!parsed.success) {
    logger.error(`Outbox event ${outboxEventId} for a partner booking is unreadable`);
    return;
  }
  await logisticsPartnerBookingService.processBookingRequest(parsed.data.bookingId);
};

export const registerLogisticsOutboxHandlers = (): void => {
  registerOutboxHandler(
    OUTBOX_TOPIC.LOGISTICS_PARTNER_WEBHOOK_RECEIVED,
    processPartnerWebhookReceived,
  );
  registerOutboxHandler(
    OUTBOX_TOPIC.LOGISTICS_PARTNER_BOOKING_REQUESTED,
    processPartnerBookingRequested,
  );
};
