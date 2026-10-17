import { hoursToMilliseconds } from "date-fns/hoursToMilliseconds";
import { minutesToMilliseconds } from "date-fns/minutesToMilliseconds";

import { logisticsPartnerBookingService } from "./partner-bookings/partner-booking.service.js";
import {
  logisticsPartnerPollingService,
  PARTNER_POLL_INTERVAL_MINUTES,
} from "./partner-webhooks/partner-polling.service.js";
import { logisticsPartnerWebhookService } from "./partner-webhooks/partner-webhook.service.js";

const STUCK_BOOKING_SWEEP_MINUTES = 10;
const WEBHOOK_RECEIPT_RETENTION_SWEEP_HOURS = 24;

export const PARTNER_TRACKING_POLL_INTERVAL_MS = minutesToMilliseconds(
  PARTNER_POLL_INTERVAL_MINUTES,
);
export const STUCK_PARTNER_BOOKING_SWEEP_INTERVAL_MS = minutesToMilliseconds(
  STUCK_BOOKING_SWEEP_MINUTES,
);
export const PARTNER_WEBHOOK_RECEIPT_RETENTION_INTERVAL_MS = hoursToMilliseconds(
  WEBHOOK_RECEIPT_RETENTION_SWEEP_HOURS,
);

export const runPartnerTrackingPoll = (): Promise<void> =>
  logisticsPartnerPollingService.pollPartnerTracking();

export const runStuckPartnerBookingSweep = (): Promise<void> =>
  logisticsPartnerBookingService.sweepStuckBookings();

export const runPartnerWebhookReceiptRetentionSweep = (): Promise<void> =>
  logisticsPartnerWebhookService.deleteOldWebhookReceipts();
