import { subHours } from "date-fns/subHours";
import { subMinutes } from "date-fns/subMinutes";

import { TrackingEventSource } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

import { logisticsPartnerAdapters } from "../logistics.partner-adapters.js";
import { logisticsPartnerEvents } from "../logistics.partner-events.js";
import { logisticsPartnerPollingRepository } from "./partner-polling.repository.js";

export const PARTNER_POLL_INTERVAL_MINUTES = 15;
const QUIET_PARCEL_HOURS = 24;
const PARCELS_POLLED_PER_RUN = 50;

export const logisticsPartnerPollingService = {
  async pollPartnerTracking(): Promise<void> {
    const now = new Date();
    const bookingsToPoll = await logisticsPartnerPollingRepository.listBookingsToPoll({
      pollOnlyPartnersBefore: subMinutes(now, PARTNER_POLL_INTERVAL_MINUTES),
      quietParcelsBefore: subHours(now, QUIET_PARCEL_HOURS),
      limit: PARCELS_POLLED_PER_RUN,
    });

    for (const { id, partnerReference, requestedAt, partner, partnerAccount } of bookingsToPoll) {
      if (partnerReference === null) continue;
      try {
        await logisticsPartnerPollingRepository.markBookingPolled(id, now);
        const adapter = logisticsPartnerAdapters.forAccount(partner, partnerAccount);
        const trackingEvents =
          (await adapter.fetchTrackingEvents?.(partnerReference, requestedAt)) ?? [];
        for (const trackingEvent of trackingEvents) {
          await logisticsPartnerEvents.applyPartnerTrackingEvent(
            partner.id,
            TrackingEventSource.PARTNER_POLL,
            trackingEvent,
          );
        }
      } catch (error) {
        logger.warn(`Couldn't check partner booking ${id} for updates: ${describeError(error)}`);
      }
    }
  },
};
