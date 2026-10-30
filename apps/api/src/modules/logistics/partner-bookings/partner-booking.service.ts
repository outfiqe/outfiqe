import { subMinutes } from "date-fns/subMinutes";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  DeliveryPartnerConnection,
  PartnerBookingStatus,
  ShipmentStatus,
  TrackingEventCode,
  TrackingEventSource,
} from "#generated/prisma/enums.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { enqueueOutboxEvent } from "#outbox/outbox.service.js";
import { describeError } from "#redis/redis.utils.js";

import { HUB_EVENT_DEDUPE_PREFIX } from "../hub-operations/hub-operation.constants.js";
import { logisticsErrors } from "../logistics.errors.js";
import { logisticsPartnerAdapters } from "../logistics.partner-adapters.js";
import type {
  DeliveryPartnerAdapter,
  PartnerBookingResult,
} from "../partners/adapters/partner-adapter.types.js";
import { PartnerRequestError } from "../partners/adapters/partner-request.error.js";
import { normalizePartnerReference } from "../partners/partner-status.utils.js";
import { logisticsShipmentBookingRepository } from "../shipments/shipment-booking.repository.js";
import { TRACKING_SUBJECT_KIND } from "../tracking/tracking.constants.js";
import { logisticsTrackingService } from "../tracking/tracking.service.js";
import { PARTNER_BOOKING_DEDUPE_PREFIX } from "./partner-booking.constants.js";
import {
  type BookingForApiRequest,
  logisticsPartnerBookingRepository,
} from "./partner-booking.repository.js";
import {
  hasBeenTriedBefore,
  isLastAutomaticAttempt,
  toPartnerBookingRequest,
} from "./partner-booking.utils.js";

const STUCK_BOOKING_MINUTES = 30;
const STUCK_BOOKING_SWEEP_BATCH_SIZE = 100;
const ATTEMPT_STEP = 1;
const MAX_STORED_REASON_LENGTH = 500;
const STUCK_BOOKING_REASON = "The partner didn't confirm this booking in time.";
const REFERENCE_TAKEN_REASON = "The partner's parcel number is already used by another parcel.";
const NO_BOOKING_SUPPORT_REASON = "This partner's connection can't book parcels.";
const UNEXPECTED_FAILURE_REASON = "Something went wrong while booking with the partner.";

type TransactionClient = Prisma.TransactionClient;

const toStoredReason = (error: unknown): string =>
  error instanceof PartnerRequestError
    ? error.message.slice(0, MAX_STORED_REASON_LENGTH)
    : UNEXPECTED_FAILURE_REASON;

const isRetryableBookingError = (error: unknown): boolean =>
  !(error instanceof PartnerRequestError) || error.isRetryable;

const shipmentSubjectFor = (shipmentId: string) =>
  ({ kind: TRACKING_SUBJECT_KIND.SHIPMENT, shipmentId }) as const;

const bookWithPartner = async (
  adapter: DeliveryPartnerAdapter,
  booking: BookingForApiRequest,
): Promise<PartnerBookingResult> => {
  if (!adapter.createShipment) {
    throw new PartnerRequestError(NO_BOOKING_SUPPORT_REASON, false);
  }
  if (hasBeenTriedBefore(booking) && adapter.findShipment) {
    const existingBooking = await adapter.findShipment(booking.merchantReference);
    if (existingBooking) return existingBooking;
  }
  return adapter.createShipment(toPartnerBookingRequest(booking));
};

const failBooking = async (booking: BookingForApiRequest, failureReason: string) => {
  const failedAt = new Date();
  await prisma.$transaction(async (tx) => {
    const isFailed = await logisticsPartnerBookingRepository.markBookingFailed(tx, {
      bookingId: booking.id,
      failureReason,
    });
    if (!isFailed) return;
    await logisticsTrackingService.recordEventInTransaction(tx, {
      subject: shipmentSubjectFor(booking.shipmentId),
      code: TrackingEventCode.BOOKING_FAILED,
      source: TrackingEventSource.SYSTEM,
      partnerId: booking.partnerId,
      dedupeKey: `${PARTNER_BOOKING_DEDUPE_PREFIX.FAILED}:${booking.id}:${failedAt.toISOString()}`,
      occurredAt: failedAt,
      note: `Booking with ${booking.partner.name} failed: ${failureReason}`,
    });
  });
  logger.warn(`Partner booking ${booking.id} failed: ${failureReason}`);
};

const confirmBooking = async (booking: BookingForApiRequest, result: PartnerBookingResult) => {
  const partnerReference = normalizePartnerReference(result.partnerReference);
  const bookedAt = new Date();
  try {
    await prisma.$transaction(async (tx) => {
      const isBooked = await logisticsPartnerBookingRepository.markBookingBookedByPartner(tx, {
        bookingId: booking.id,
        partnerReference,
        partnerLabelUrl: result.labelUrl,
        partnerTrackingUrl: result.partnerTrackingUrl,
        bookedAt,
      });
      if (!isBooked) return;
      await logisticsTrackingService.recordEventInTransaction(tx, {
        subject: shipmentSubjectFor(booking.shipmentId),
        code: TrackingEventCode.BOOKING_CONFIRMED,
        source: TrackingEventSource.SYSTEM,
        partnerId: booking.partnerId,
        dedupeKey: `${HUB_EVENT_DEDUPE_PREFIX.BOOKING_CONFIRMED}:${booking.id}`,
        occurredAt: bookedAt,
        note: `Booked with ${booking.partner.name} as ${partnerReference}.`,
      });
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    await failBooking(booking, REFERENCE_TAKEN_REASON);
  }
};

const requireFailedApiBooking = async (shipmentId: string) => {
  const booking = await logisticsShipmentBookingRepository.findLiveBookingForShipment(
    prisma,
    shipmentId,
  );
  const isRetryable =
    booking?.status === PartnerBookingStatus.BOOKING_FAILED &&
    booking.connection === DeliveryPartnerConnection.API;
  if (!booking || !isRetryable) {
    throw new AppError(
      "BOOKING_NOT_RETRYABLE",
      "Only a failed booking with a connected partner can be tried again.",
      HTTP_STATUS.CONFLICT,
    );
  }
  return booking;
};

export const logisticsPartnerBookingService = {
  async queueApiBooking(
    tx: TransactionClient,
    booking: { bookingId: string; connection: DeliveryPartnerConnection },
  ): Promise<void> {
    if (booking.connection !== DeliveryPartnerConnection.API) return;
    await enqueueOutboxEvent(tx, {
      topic: OUTBOX_TOPIC.LOGISTICS_PARTNER_BOOKING_REQUESTED,
      aggregateId: booking.bookingId,
      payload: { bookingId: booking.bookingId },
    });
  },

  async processBookingRequest(bookingId: string): Promise<void> {
    const booking = await logisticsPartnerBookingRepository.findBookingForApiRequest(bookingId);
    const isWaitingForPartner =
      booking?.status === PartnerBookingStatus.REQUESTED &&
      booking.connection === DeliveryPartnerConnection.API;
    if (!booking || !isWaitingForPartner) return;

    const isClaimed = await logisticsPartnerBookingRepository.claimBookingAttempt(
      bookingId,
      new Date(),
    );
    if (!isClaimed) return;
    const attemptNumber = booking.bookingAttempts + ATTEMPT_STEP;

    let result: PartnerBookingResult;
    try {
      const adapter = logisticsPartnerAdapters.forAccount(booking.partner, booking.partnerAccount);
      result = await bookWithPartner(adapter, booking);
    } catch (error) {
      logger.warn(`Partner booking ${bookingId} attempt ${attemptNumber}: ${describeError(error)}`);
      const failureReason = toStoredReason(error);
      if (isRetryableBookingError(error) && !isLastAutomaticAttempt(attemptNumber)) {
        await logisticsPartnerBookingRepository.recordAttemptError(bookingId, failureReason);
        throw error;
      }
      await failBooking(booking, failureReason);
      return;
    }
    await confirmBooking(booking, result);
  },

  async retryFailedBooking(staffUserId: string, shipmentId: string): Promise<void> {
    const shipment = await logisticsPartnerBookingRepository.findShipmentStatus(shipmentId);
    if (!shipment) {
      throw logisticsErrors.parcelNotFound();
    }
    if (shipment.status !== ShipmentStatus.PACKED) {
      throw logisticsErrors.parcelAlreadyLeft();
    }
    const booking = await requireFailedApiBooking(shipmentId);
    const requestedAt = new Date();
    await prisma.$transaction(async (tx) => {
      const isRequeued = await logisticsPartnerBookingRepository.requeueFailedBooking(tx, {
        bookingId: booking.id,
        requestedById: staffUserId,
        requestedAt,
      });
      if (!isRequeued) {
        throw logisticsErrors.bookingChanged();
      }
      await logisticsTrackingService.recordEventInTransaction(tx, {
        subject: shipmentSubjectFor(shipmentId),
        code: TrackingEventCode.BOOKING_REQUESTED,
        source: TrackingEventSource.HUB,
        actorUserId: staffUserId,
        partnerId: booking.partnerId,
        dedupeKey: `${PARTNER_BOOKING_DEDUPE_PREFIX.RETRIED}:${booking.id}:${requestedAt.toISOString()}`,
        occurredAt: requestedAt,
        note: `Trying the booking with ${booking.partner.name} again.`,
      });
      await logisticsPartnerBookingService.queueApiBooking(tx, {
        bookingId: booking.id,
        connection: booking.connection,
      });
    });
  },

  async sweepStuckBookings(): Promise<void> {
    const stuckBookingIds = await logisticsPartnerBookingRepository.listStuckBookingIds({
      stuckBefore: subMinutes(new Date(), STUCK_BOOKING_MINUTES),
      limit: STUCK_BOOKING_SWEEP_BATCH_SIZE,
    });
    for (const bookingId of stuckBookingIds) {
      try {
        const booking = await logisticsPartnerBookingRepository.findBookingForApiRequest(bookingId);
        if (booking) await failBooking(booking, STUCK_BOOKING_REASON);
      } catch (error) {
        logger.error(`Couldn't close stuck partner booking ${bookingId}: ${describeError(error)}`);
      }
    }
  },
};
