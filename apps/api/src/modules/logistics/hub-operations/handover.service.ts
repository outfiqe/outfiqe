import { formatParcelCode, normalizeParcelCode } from "@outfiqe/utils";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  PartnerBookingStatus,
  ShipmentStatus,
  TrackingEventCode,
  TrackingEventSource,
} from "#generated/prisma/enums.js";
import { withIdempotency } from "#lib/idempotency.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { logisticsShipmentBookingRepository } from "../shipments/shipment-booking.repository.js";
import { TRACKING_SUBJECT_KIND } from "../tracking/tracking.constants.js";
import { logisticsTrackingService } from "../tracking/tracking.service.js";
import { HUB_EVENT_DEDUPE_PREFIX } from "./hub-operation.constants.js";
import { logisticsHubOperationRepository } from "./hub-operation.repository.js";
import type { HandOverParcelBody } from "./hub-operation.schemas.js";
import type { ParcelHandoverView, ParcelLabelView } from "./hub-operation.types.js";
import { logisticsParcelCash } from "./parcel-cash.js";

const HANDOVER_IDEMPOTENCY_ENDPOINT = "logistics:hub-parcel-handover";

const parcelNotFoundError = () =>
  new AppError("PARCEL_NOT_FOUND", "Parcel not found.", HTTP_STATUS.NOT_FOUND);

const requireParcelLabel = async (shipmentId: string): Promise<ParcelLabelView> => {
  await logisticsParcelCash.refreshParcelCash(shipmentId);
  const parcel = await logisticsHubOperationRepository.findParcelForLabel(shipmentId);
  if (!parcel) throw parcelNotFoundError();
  const { order, hub, bookings } = parcel;
  const [liveBooking] = bookings;
  return {
    shipmentId: parcel.id,
    trackingCode: parcel.trackingCode,
    displayTrackingCode: formatParcelCode(parcel.trackingCode),
    orderId: order.id,
    status: parcel.status,
    currency: parcel.currency,
    codAmountToCollect: parcel.codAmountToCollect,
    isLabelUpToDate: parcel.labelCodAmount === parcel.codAmountToCollect,
    labelPrintedAt: parcel.labelPrintedAt?.toISOString() ?? null,
    weightGrams: parcel.weightGrams,
    parcelCount: parcel.parcelCount,
    packedAt: parcel.createdAt.toISOString(),
    recipient: {
      fullName: order.fullName,
      phone: order.phoneE164 ?? order.phone,
      address: order.address,
      city: order.city,
      landmark: order.landmark,
    },
    sender: { name: hub.name, address: hub.address, city: hub.city, phone: hub.phoneE164 },
    partner: liveBooking
      ? {
          name: liveBooking.partner.name,
          partnerReference: liveBooking.partnerReference,
          partnerLabelUrl: liveBooking.partnerLabelUrl,
          status: liveBooking.status,
        }
      : null,
  };
};

const handOverOnce = async (
  staffUserId: string,
  { hubId, code }: HandOverParcelBody,
): Promise<ParcelHandoverView> => {
  const trackingCode = normalizeParcelCode(code);
  const shipment = trackingCode
    ? await logisticsHubOperationRepository.findShipmentByTrackingCode(trackingCode)
    : null;
  if (!shipment || !trackingCode) {
    throw new AppError(
      "CODE_NOT_RECOGNISED",
      "That isn't one of our parcel codes. Check the label and try again.",
      HTTP_STATUS.NOT_FOUND,
    );
  }
  if (shipment.hubId !== hubId) {
    throw new AppError(
      "PARCEL_FOR_ANOTHER_HUB",
      "This parcel belongs to a different hub.",
      HTTP_STATUS.CONFLICT,
    );
  }
  if (shipment.status === ShipmentStatus.HANDED_TO_PARTNER) {
    return { shipmentId: shipment.id, trackingCode, status: shipment.status };
  }
  if (shipment.status !== ShipmentStatus.PACKED) {
    throw new AppError(
      "PARCEL_NOT_READY_TO_HAND_OVER",
      "This parcel isn't waiting at the hub.",
      HTTP_STATUS.CONFLICT,
    );
  }

  const booking = await logisticsShipmentBookingRepository.findLiveBookingForShipment(
    prisma,
    shipment.id,
  );
  if (booking?.status !== PartnerBookingStatus.BOOKED) {
    throw new AppError(
      "PARCEL_NOT_BOOKED",
      "Book this parcel with the partner and enter their parcel number before handing it over.",
      HTTP_STATUS.CONFLICT,
    );
  }
  const label = await requireParcelLabel(shipment.id);
  if (label.labelPrintedAt === null) {
    throw new AppError(
      "LABEL_NOT_PRINTED",
      "Print this parcel's label and stick it on before handing it over.",
      HTTP_STATUS.CONFLICT,
    );
  }
  if (!label.isLabelUpToDate) {
    throw new AppError(
      "LABEL_OUT_OF_DATE",
      "The cash to collect has changed since the label was printed. Print a new label first.",
      HTTP_STATUS.CONFLICT,
    );
  }

  const outcome = await logisticsTrackingService.recordEvent({
    subject: { kind: TRACKING_SUBJECT_KIND.SHIPMENT, shipmentId: shipment.id },
    code: TrackingEventCode.HANDED_TO_PARTNER,
    source: TrackingEventSource.HUB,
    actorUserId: staffUserId,
    partnerId: booking.partnerId,
    dedupeKey: `${HUB_EVENT_DEDUPE_PREFIX.PARCEL_HANDED_OVER}:${shipment.id}`,
    occurredAt: new Date(),
  });
  return {
    shipmentId: shipment.id,
    trackingCode,
    status: outcome.appliedToStatus ? ShipmentStatus.HANDED_TO_PARTNER : shipment.status,
  };
};

export const logisticsHandoverService = {
  getParcelLabel: requireParcelLabel,

  async markParcelLabelPrinted(shipmentId: string): Promise<ParcelLabelView> {
    const label = await requireParcelLabel(shipmentId);
    await logisticsHubOperationRepository.markLabelPrinted(shipmentId, {
      labelCodAmount: label.codAmountToCollect,
      labelPrintedAt: new Date(),
    });
    return requireParcelLabel(shipmentId);
  },

  handOverParcel(
    staffUserId: string,
    body: HandOverParcelBody,
    idempotencyKey: string,
  ): Promise<ParcelHandoverView> {
    return withIdempotency(
      staffUserId,
      HANDOVER_IDEMPOTENCY_ENDPOINT,
      idempotencyKey,
      () => handOverOnce(staffUserId, body),
      body,
    );
  },
};
