import { PARCEL_CODE_BODY_LENGTH, PARCEL_CODE_PREFIX } from "@outfiqe/utils";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  PartnerBookingStatus,
  PickupStatus,
  ShipmentStatus,
  TrackingEventCode,
  TrackingEventSource,
} from "#generated/prisma/enums.js";
import { generateRandomCode } from "#lib/random-code.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { PICKUP_STATUSES_NOT_COMING_TO_HUB } from "../logistics.constants.js";
import { merchantReferenceForBooking } from "../partners/partner-status.utils.js";
import { logisticsShipmentBookingRepository } from "../shipments/shipment-booking.repository.js";
import { TRACKING_SUBJECT_KIND } from "../tracking/tracking.constants.js";
import { logisticsTrackingService } from "../tracking/tracking.service.js";
import type { RecordTrackingEventOutcome } from "../tracking/tracking.types.js";
import { HUB_EVENT_DEDUPE_PREFIX } from "./hub-operation.constants.js";
import {
  logisticsHubOperationRepository,
  type OrderForPacking,
} from "./hub-operation.repository.js";
import type { PackParcelBody } from "./hub-operation.schemas.js";
import type { PackedParcelView } from "./hub-operation.types.js";
import { logisticsParcelCash } from "./parcel-cash.js";
import { logisticsParcelPartner, type ParcelPartnerChoice } from "./parcel-partner.js";

const TRACKING_CODE_ATTEMPTS = 5;
const NO_ATTEMPTS_LEFT = 0;
const ATTEMPT_STEP = 1;
const NO_PICKUPS = 0;
const NOTHING_TO_COLLECT = 0;
const NO_EARLIER_BOOKINGS = 0;

type TransactionClient = Prisma.TransactionClient;
type PickupForPacking = OrderForPacking["fulfilmentGroups"][number];

const isWaitingToPack = ({ pickupStatus, shipmentId }: PickupForPacking) =>
  pickupStatus === PickupStatus.AT_HUB && shipmentId === null;

const isStillComing = ({ pickupStatus }: PickupForPacking) =>
  pickupStatus !== null && !PICKUP_STATUSES_NOT_COMING_TO_HUB.has(pickupStatus);

const generateFreeTrackingCode = async (
  client: TransactionClient,
  attemptsLeft: number = TRACKING_CODE_ATTEMPTS,
): Promise<string> => {
  const trackingCode = `${PARCEL_CODE_PREFIX}${generateRandomCode(PARCEL_CODE_BODY_LENGTH)}`;
  const isTaken = await logisticsHubOperationRepository.isTrackingCodeTaken(client, trackingCode);
  if (!isTaken) return trackingCode;
  if (attemptsLeft <= NO_ATTEMPTS_LEFT) {
    throw new AppError(
      "TRACKING_CODE_UNAVAILABLE",
      "Couldn't make a parcel code. Please try again.",
      HTTP_STATUS.SERVICE_UNAVAILABLE,
    );
  }
  return generateFreeTrackingCode(client, attemptsLeft - ATTEMPT_STEP);
};

const selectPickupsToPack = (order: OrderForPacking, packsOnlyPickupsAtHub: boolean) => {
  const pickupsAtHub = order.fulfilmentGroups.filter(isWaitingToPack);
  if (pickupsAtHub.length === NO_PICKUPS) {
    throw new AppError(
      "NOTHING_TO_PACK",
      "None of this order's bags are waiting at the hub.",
      HTTP_STATUS.CONFLICT,
    );
  }
  const stillComingCount = order.fulfilmentGroups.filter(isStillComing).length;
  if (stillComingCount > NO_PICKUPS && !packsOnlyPickupsAtHub) {
    throw new AppError(
      "PICKUPS_STILL_COMING",
      `${stillComingCount} more bag(s) for this order haven't reached the hub yet. Wait for them, or pack only what's here.`,
      HTTP_STATUS.CONFLICT,
    );
  }
  const [firstPickup] = pickupsAtHub;
  const hubId = firstPickup?.hubId ?? null;
  if (hubId === null || pickupsAtHub.some((pickup) => pickup.hubId !== hubId)) {
    throw new AppError(
      "PICKUPS_AT_DIFFERENT_HUBS",
      "This order's bags are at different hubs, so they can't go in one parcel.",
      HTTP_STATUS.CONFLICT,
    );
  }
  return { hubId, fulfilmentGroupIds: pickupsAtHub.map(({ id }) => id) };
};

const recordParcelEvents = async (
  tx: TransactionClient,
  params: {
    staffUserId: string;
    shipmentId: string;
    fulfilmentGroupIds: readonly string[];
    booking: { bookingId: string; partnerId: string } | null;
    occurredAt: Date;
  },
): Promise<RecordTrackingEventOutcome[]> => {
  const { staffUserId, shipmentId, fulfilmentGroupIds, booking, occurredAt } = params;
  const pickupOutcomes: RecordTrackingEventOutcome[] = [];
  for (const fulfilmentGroupId of fulfilmentGroupIds) {
    pickupOutcomes.push(
      await logisticsTrackingService.recordEventInTransaction(tx, {
        subject: { kind: TRACKING_SUBJECT_KIND.PICKUP, fulfilmentGroupId },
        code: TrackingEventCode.IN_PARCEL,
        source: TrackingEventSource.HUB,
        actorUserId: staffUserId,
        dedupeKey: `${HUB_EVENT_DEDUPE_PREFIX.PICKUP_IN_PARCEL}:${fulfilmentGroupId}:${shipmentId}`,
        occurredAt,
      }),
    );
  }
  const shipmentSubject = { kind: TRACKING_SUBJECT_KIND.SHIPMENT, shipmentId } as const;
  await logisticsTrackingService.recordEventInTransaction(tx, {
    subject: shipmentSubject,
    code: TrackingEventCode.PACKED,
    source: TrackingEventSource.HUB,
    actorUserId: staffUserId,
    dedupeKey: `${HUB_EVENT_DEDUPE_PREFIX.PARCEL_PACKED}:${shipmentId}`,
    occurredAt,
  });
  if (booking !== null) {
    await logisticsTrackingService.recordEventInTransaction(tx, {
      subject: shipmentSubject,
      code: TrackingEventCode.BOOKING_REQUESTED,
      source: TrackingEventSource.HUB,
      actorUserId: staffUserId,
      partnerId: booking.partnerId,
      dedupeKey: `${HUB_EVENT_DEDUPE_PREFIX.BOOKING_REQUESTED}:${shipmentId}:${booking.bookingId}`,
      occurredAt,
    });
  }
  return pickupOutcomes;
};

const packInTransaction = async (
  tx: TransactionClient,
  params: {
    staffUserId: string;
    order: OrderForPacking;
    hubId: string;
    fulfilmentGroupIds: readonly string[];
    codAmountToCollect: number;
    partner: ParcelPartnerChoice | null;
    body: PackParcelBody;
  },
) => {
  const { staffUserId, order, hubId, fulfilmentGroupIds, codAmountToCollect, partner, body } =
    params;
  const trackingCode = await generateFreeTrackingCode(tx);
  const shipment = await logisticsHubOperationRepository.createShipment(tx, {
    orderId: order.id,
    hubId,
    trackingCode,
    currency: order.currency,
    codAmountToCollect,
    weightGrams: body.weightGrams,
    parcelCount: body.parcelCount,
    packedById: staffUserId,
  });
  const attachedCount = await logisticsHubOperationRepository.attachPickupsAtHub(tx, {
    fulfilmentGroupIds,
    shipmentId: shipment.id,
  });
  if (attachedCount !== fulfilmentGroupIds.length) {
    throw new AppError(
      "PICKUPS_CHANGED_WHILE_PACKING",
      "Someone else changed these bags while you were packing. Refresh and try again.",
      HTTP_STATUS.CONFLICT,
    );
  }
  const booking = partner
    ? await logisticsShipmentBookingRepository.createBooking(tx, {
        shipmentId: shipment.id,
        partnerId: partner.partnerId,
        partnerAccountId: partner.partnerAccountId,
        merchantReference: merchantReferenceForBooking(trackingCode, NO_EARLIER_BOOKINGS),
        connection: partner.connection,
        requestedById: staffUserId,
      })
    : null;
  const pickupOutcomes = await recordParcelEvents(tx, {
    staffUserId,
    shipmentId: shipment.id,
    fulfilmentGroupIds,
    booking: booking && partner ? { bookingId: booking.id, partnerId: partner.partnerId } : null,
    occurredAt: new Date(),
  });
  return { shipment, booking, pickupOutcomes };
};

export const logisticsPackingService = {
  async packParcel(
    staffUserId: string,
    orderId: string,
    body: PackParcelBody,
  ): Promise<PackedParcelView> {
    const order = await logisticsHubOperationRepository.findOrderForPacking(orderId);
    if (!order) throw new AppError("ORDER_NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND);
    const { hubId, fulfilmentGroupIds } = selectPickupsToPack(order, body.packsOnlyPickupsAtHub);

    const firstShipmentId = await logisticsHubOperationRepository.findFirstShipmentIdForOrder(
      prisma,
      orderId,
    );
    const codAmountToCollect = await logisticsParcelCash.calculateParcelCash({
      orderId,
      fulfilmentGroupIds,
      isFirstParcelOfOrder: firstShipmentId === null,
    });
    const partner = await logisticsParcelPartner.choosePartner({
      hubId,
      city: order.city,
      countryCode: order.countryCode,
      requiresCod: codAmountToCollect > NOTHING_TO_COLLECT,
      requestedPartnerId: body.partnerId,
    });

    const { shipment, booking, pickupOutcomes } = await prisma.$transaction((tx) =>
      packInTransaction(tx, {
        staffUserId,
        order,
        hubId,
        fulfilmentGroupIds,
        codAmountToCollect,
        partner,
        body,
      }),
    );
    for (const outcome of pickupOutcomes) {
      await logisticsTrackingService.announceStageChange(outcome);
    }

    return {
      shipmentId: shipment.id,
      trackingCode: shipment.trackingCode,
      status: ShipmentStatus.PACKED,
      codAmountToCollect,
      fulfilmentGroupIds: [...fulfilmentGroupIds],
      booking:
        booking && partner
          ? {
              bookingId: booking.id,
              partnerId: partner.partnerId,
              partnerName: partner.partnerName,
              status: PartnerBookingStatus.REQUESTED,
              merchantReference: shipment.trackingCode,
              partnerReference: null,
            }
          : null,
    };
  },
};
