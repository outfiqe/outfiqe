import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  DeliveryPartnerConnection,
  PartnerBookingStatus,
  ShipmentStatus,
  TrackingEventCode,
  TrackingEventSource,
} from "#generated/prisma/enums.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { logisticsPartnerBookingService } from "../partner-bookings/partner-booking.service.js";
import {
  isReferenceAllowedByPattern,
  merchantReferenceForBooking,
  normalizePartnerReference,
} from "../partners/partner-status.utils.js";
import { toParcelBookingSummary } from "../shipments/shipment.utils.js";
import { logisticsShipmentBookingRepository } from "../shipments/shipment-booking.repository.js";
import { TRACKING_SUBJECT_KIND } from "../tracking/tracking.constants.js";
import { logisticsTrackingService } from "../tracking/tracking.service.js";
import { HUB_EVENT_DEDUPE_PREFIX } from "./hub-operation.constants.js";
import { logisticsHubOperationRepository } from "./hub-operation.repository.js";
import type { RebookParcelBody, RecordManualBookingBody } from "./hub-operation.schemas.js";
import type { ParcelBookingSummary } from "./hub-operation.types.js";
import { logisticsParcelPartner } from "./parcel-partner.js";

const NOTHING_TO_COLLECT = 0;
const BOOKING_CANCELLED_NOTE_PREFIX = "Booking cancelled";

const BOOKABLE_STATUSES: ReadonlySet<PartnerBookingStatus> = new Set([
  PartnerBookingStatus.REQUESTED,
  PartnerBookingStatus.BOOKING_FAILED,
]);

const isBeingBookedAutomatically = (booking: {
  status: PartnerBookingStatus;
  connection: DeliveryPartnerConnection;
}) =>
  booking.status === PartnerBookingStatus.REQUESTED &&
  booking.connection === DeliveryPartnerConnection.API;

const parcelNotFoundError = () =>
  new AppError("PARCEL_NOT_FOUND", "Parcel not found.", HTTP_STATUS.NOT_FOUND);

const requirePackedParcel = async (shipmentId: string) => {
  const shipment = await logisticsHubOperationRepository.findShipmentForMoney(prisma, shipmentId);
  if (!shipment) throw parcelNotFoundError();
  if (shipment.status !== ShipmentStatus.PACKED) {
    throw new AppError(
      "PARCEL_ALREADY_LEFT",
      "This parcel has already left the hub, so its booking can't be changed here.",
      HTTP_STATUS.CONFLICT,
    );
  }
  return shipment;
};

const requireLiveBookingSummary = async (shipmentId: string) => {
  const booking = await logisticsShipmentBookingRepository.findLiveBookingForShipment(
    prisma,
    shipmentId,
  );
  if (!booking) throw parcelNotFoundError();
  return toParcelBookingSummary(booking);
};

export const logisticsParcelBookingService = {
  async recordManualBooking(
    staffUserId: string,
    shipmentId: string,
    { partnerReference }: RecordManualBookingBody,
  ): Promise<ParcelBookingSummary> {
    await requirePackedParcel(shipmentId);
    const booking = await logisticsShipmentBookingRepository.findLiveBookingForShipment(
      prisma,
      shipmentId,
    );
    if (!booking || !BOOKABLE_STATUSES.has(booking.status)) {
      throw new AppError(
        "PARCEL_NOT_WAITING_FOR_BOOKING",
        "This parcel isn't waiting for a booking. Choose a partner first.",
        HTTP_STATUS.CONFLICT,
      );
    }
    if (isBeingBookedAutomatically(booking)) {
      throw new AppError(
        "BOOKING_IN_PROGRESS",
        `We're booking this parcel with ${booking.partner.name} now. Wait for it to finish or fail.`,
        HTTP_STATUS.CONFLICT,
      );
    }
    const reference = normalizePartnerReference(partnerReference);
    if (!isReferenceAllowedByPattern(booking.partner.referencePattern, reference)) {
      throw new AppError(
        "PARTNER_REFERENCE_INVALID",
        `That doesn't look like a ${booking.partner.name} parcel number. Check it and try again.`,
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
      );
    }

    const bookedAt = new Date();
    try {
      await prisma.$transaction(async (tx) => {
        const isBooked = await logisticsShipmentBookingRepository.markBookingBooked(tx, {
          bookingId: booking.id,
          partnerReference: reference,
          bookedById: staffUserId,
          bookedAt,
        });
        if (!isBooked) {
          throw new AppError(
            "BOOKING_CHANGED",
            "This booking was changed by someone else. Refresh and try again.",
            HTTP_STATUS.CONFLICT,
          );
        }
        await logisticsTrackingService.recordEventInTransaction(tx, {
          subject: { kind: TRACKING_SUBJECT_KIND.SHIPMENT, shipmentId },
          code: TrackingEventCode.BOOKING_CONFIRMED,
          source: TrackingEventSource.HUB,
          actorUserId: staffUserId,
          partnerId: booking.partnerId,
          dedupeKey: `${HUB_EVENT_DEDUPE_PREFIX.BOOKING_CONFIRMED}:${booking.id}`,
          occurredAt: bookedAt,
          note: `Booked with ${booking.partner.name} as ${reference}.`,
        });
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      throw new AppError(
        "PARTNER_REFERENCE_TAKEN",
        "Another parcel is already booked with that partner number.",
        HTTP_STATUS.CONFLICT,
      );
    }
    return requireLiveBookingSummary(shipmentId);
  },

  async retryParcelBooking(staffUserId: string, shipmentId: string): Promise<ParcelBookingSummary> {
    await logisticsPartnerBookingService.retryFailedBooking(staffUserId, shipmentId);
    return requireLiveBookingSummary(shipmentId);
  },

  async rebookParcel(
    staffUserId: string,
    shipmentId: string,
    { partnerId, reason }: RebookParcelBody,
  ): Promise<ParcelBookingSummary> {
    const shipment = await requirePackedParcel(shipmentId);
    const order = await logisticsHubOperationRepository.findOrderForPacking(shipment.orderId);
    if (!order) throw parcelNotFoundError();
    const partner = await logisticsParcelPartner.choosePartner({
      hubId: shipment.hubId,
      city: order.city,
      countryCode: order.countryCode,
      requiresCod: shipment.codAmountToCollect > NOTHING_TO_COLLECT,
      requestedPartnerId: partnerId,
    });
    if (!partner) throw parcelNotFoundError();

    const occurredAt = new Date();
    await prisma.$transaction(async (tx) => {
      const liveBooking = await logisticsShipmentBookingRepository.findLiveBookingForShipment(
        tx,
        shipmentId,
      );
      if (liveBooking) {
        await logisticsShipmentBookingRepository.cancelLiveBooking(tx, {
          bookingId: liveBooking.id,
          cancelReason: reason,
          cancelledAt: occurredAt,
        });
        await logisticsTrackingService.recordEventInTransaction(tx, {
          subject: { kind: TRACKING_SUBJECT_KIND.SHIPMENT, shipmentId },
          code: TrackingEventCode.NOTE,
          source: TrackingEventSource.HUB,
          actorUserId: staffUserId,
          partnerId: liveBooking.partnerId,
          dedupeKey: `${HUB_EVENT_DEDUPE_PREFIX.BOOKING_CANCELLED}:${liveBooking.id}`,
          occurredAt,
          note: `${BOOKING_CANCELLED_NOTE_PREFIX} with ${liveBooking.partner.name}: ${reason}`,
        });
      }
      const earlierBookingsWithPartner =
        await logisticsShipmentBookingRepository.countBookingsWithPartner(
          tx,
          shipmentId,
          partner.partnerId,
        );
      const booking = await logisticsShipmentBookingRepository.createBooking(tx, {
        shipmentId,
        partnerId: partner.partnerId,
        partnerAccountId: partner.partnerAccountId,
        merchantReference: merchantReferenceForBooking(
          shipment.trackingCode,
          earlierBookingsWithPartner,
        ),
        connection: partner.connection,
        requestedById: staffUserId,
      });
      await logisticsTrackingService.recordEventInTransaction(tx, {
        subject: { kind: TRACKING_SUBJECT_KIND.SHIPMENT, shipmentId },
        code: TrackingEventCode.BOOKING_REQUESTED,
        source: TrackingEventSource.HUB,
        actorUserId: staffUserId,
        partnerId: partner.partnerId,
        dedupeKey: `${HUB_EVENT_DEDUPE_PREFIX.BOOKING_REQUESTED}:${shipmentId}:${booking.id}`,
        occurredAt,
      });
      await logisticsPartnerBookingService.queueApiBooking(tx, {
        bookingId: booking.id,
        connection: partner.connection,
      });
    });
    return requireLiveBookingSummary(shipmentId);
  },
};
