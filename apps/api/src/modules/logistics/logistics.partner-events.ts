import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  PartnerBookingStatus,
  PartnerStatusImportRowOutcome,
  ShipmentStatus,
  TrackingEventCode,
  type TrackingEventSource,
} from "#generated/prisma/enums.js";
import { toStoredJson } from "#lib/stored-json.utils.js";

import type { PartnerTrackingEvent } from "./partners/adapters/partner-adapter.types.js";
import { logisticsPartnerRepository } from "./partners/partner.repository.js";
import {
  buildPartnerEventDedupeKey,
  normalizePartnerRawStatus,
  normalizePartnerReference,
  parcelCodeFromMerchantReference,
} from "./partners/partner-status.utils.js";
import {
  type BookingForMatching,
  logisticsShipmentBookingRepository,
} from "./shipments/shipment-booking.repository.js";
import { TRACKING_SUBJECT_KIND } from "./tracking/tracking.constants.js";
import { logisticsTrackingService } from "./tracking/tracking.service.js";

const HANDOVER_NOT_SCANNED_DEDUPE_PREFIX = "handover-not-scanned";
const UNREADABLE_PARTNER_PAYLOAD = { note: "The partner's update couldn't be stored as JSON." };

export type PartnerEventResult = {
  outcome: PartnerStatusImportRowOutcome;
  trackingEventId: string | null;
  message: string | null;
};

const unmatchedResult = (message: string): PartnerEventResult => ({
  outcome: PartnerStatusImportRowOutcome.UNMATCHED_REFERENCE,
  trackingEventId: null,
  message,
});

const findMatchingBooking = async (
  partnerId: string,
  { partnerReference, merchantReference }: PartnerTrackingEvent,
): Promise<BookingForMatching | null> => {
  if (partnerReference) {
    const booking = await logisticsShipmentBookingRepository.findBookingByPartnerReference(
      prisma,
      partnerId,
      normalizePartnerReference(partnerReference),
    );
    if (booking) return booking;
  }
  const parcelCode = merchantReference ? parcelCodeFromMerchantReference(merchantReference) : null;
  if (!parcelCode) return null;
  return logisticsShipmentBookingRepository.findLatestBookingForParcel(
    prisma,
    partnerId,
    parcelCode,
  );
};

const toStoredPayload = (rawPayload: unknown): Prisma.InputJsonValue =>
  toStoredJson(rawPayload, UNREADABLE_PARTNER_PAYLOAD);

const recordShipmentNote = async (
  partnerId: string,
  source: TrackingEventSource,
  booking: BookingForMatching,
  event: PartnerTrackingEvent,
  code: typeof TrackingEventCode.NOTE | typeof TrackingEventCode.UNKNOWN_PARTNER_STATUS,
) => {
  const { eventId } = await logisticsTrackingService.recordEvent({
    subject: { kind: TRACKING_SUBJECT_KIND.SHIPMENT, shipmentId: booking.shipmentId },
    code,
    source,
    partnerId,
    dedupeKey: `${partnerId}:${code}:${buildPartnerEventDedupeKey({ ...event, bookingId: booking.id })}`,
    occurredAt: event.occurredAt,
    rawStatus: event.rawStatus,
    rawPayload: toStoredPayload(event.rawPayload),
    ...(event.location ? { location: event.location } : {}),
    ...(event.rawReason ? { note: event.rawReason } : {}),
  });
  return eventId;
};

const recordHandoverNotScanned = async (
  partnerId: string,
  source: TrackingEventSource,
  booking: BookingForMatching,
  occurredAt: Date,
) => {
  await logisticsTrackingService.recordEvent({
    subject: { kind: TRACKING_SUBJECT_KIND.SHIPMENT, shipmentId: booking.shipmentId },
    code: TrackingEventCode.HANDOVER_NOT_SCANNED,
    source,
    partnerId,
    dedupeKey: `${partnerId}:${HANDOVER_NOT_SCANNED_DEDUPE_PREFIX}:${booking.shipmentId}`,
    occurredAt,
  });
};

export const logisticsPartnerEvents = {
  async applyPartnerTrackingEvent(
    partnerId: string,
    source: TrackingEventSource,
    event: PartnerTrackingEvent,
  ): Promise<PartnerEventResult> {
    const booking = await findMatchingBooking(partnerId, event);
    if (!booking) return unmatchedResult("No parcel with this partner matches that reference.");

    if (booking.status === PartnerBookingStatus.CANCELLED) {
      const trackingEventId = await recordShipmentNote(
        partnerId,
        source,
        booking,
        event,
        TrackingEventCode.NOTE,
      );
      return {
        outcome: PartnerStatusImportRowOutcome.NOT_APPLIED,
        trackingEventId,
        message: "This booking was cancelled, so the update was saved but not applied.",
      };
    }

    const mapping = await logisticsPartnerRepository.findStatusMapping(
      prisma,
      partnerId,
      normalizePartnerRawStatus(event.rawStatus),
    );
    if (!mapping) {
      const trackingEventId = await recordShipmentNote(
        partnerId,
        source,
        booking,
        event,
        TrackingEventCode.UNKNOWN_PARTNER_STATUS,
      );
      return {
        outcome: PartnerStatusImportRowOutcome.UNKNOWN_STATUS,
        trackingEventId,
        message: `"${event.rawStatus}" isn't in this partner's status names yet.`,
      };
    }

    const outcome = await logisticsTrackingService.recordEvent({
      subject: { kind: TRACKING_SUBJECT_KIND.SHIPMENT, shipmentId: booking.shipmentId },
      code: mapping.canonicalCode,
      source,
      partnerId,
      dedupeKey: `${partnerId}:${buildPartnerEventDedupeKey({ ...event, bookingId: booking.id })}`,
      occurredAt: event.occurredAt,
      rawStatus: event.rawStatus,
      rawPayload: toStoredPayload(event.rawPayload),
      ...(mapping.reasonCode ? { reasonCode: mapping.reasonCode } : {}),
      ...(event.location ? { location: event.location } : {}),
      ...(event.rawReason ? { note: event.rawReason } : {}),
    });

    const skippedHandoverScan =
      outcome.appliedToStatus &&
      booking.shipment.status === ShipmentStatus.PACKED &&
      mapping.canonicalCode !== TrackingEventCode.HANDED_TO_PARTNER;
    if (skippedHandoverScan) {
      await recordHandoverNotScanned(partnerId, source, booking, event.occurredAt);
    }

    if (outcome.wasDuplicate) {
      return {
        outcome: PartnerStatusImportRowOutcome.DUPLICATE,
        trackingEventId: outcome.eventId,
        message: "This update was already recorded.",
      };
    }
    return outcome.appliedToStatus
      ? {
          outcome: PartnerStatusImportRowOutcome.APPLIED,
          trackingEventId: outcome.eventId,
          message: null,
        }
      : {
          outcome: PartnerStatusImportRowOutcome.NOT_APPLIED,
          trackingEventId: outcome.eventId,
          message: "Saved, but it doesn't move the parcel forward from where it is now.",
        };
  },
};
