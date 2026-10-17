import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  ItemInspectionStatus,
  OrderRefundCause,
  PickupStatus,
  TrackingEventCode,
  TrackingEventSource,
} from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";
import { orderService } from "#modules/orders/order.service.js";

import { TRACKING_SUBJECT_KIND } from "../tracking/tracking.constants.js";
import { logisticsTrackingService } from "../tracking/tracking.service.js";
import { logisticsHubOperationRepository } from "./hub-operation.repository.js";
import type { RecordInspectionBody } from "./hub-operation.schemas.js";
import type { PickupInspectionView } from "./hub-operation.types.js";

const INSPECTION_DEDUPE_PREFIX = "hub-inspection";
const INSPECTION_REFUND_KEY_PREFIX = "hub-inspection-refund";
const DEFAULT_FAILED_INSPECTION_REASON = "Didn't pass the hub quality check";
const NO_UNITS = 0;

type PickupForInspection = NonNullable<
  Awaited<ReturnType<typeof logisticsHubOperationRepository.findPickupForInspection>>
>;

const requirePickupReadyForInspection = async (groupId: string) => {
  const pickup = await logisticsHubOperationRepository.findPickupForInspection(groupId);
  if (!pickup) throw new AppError("PICKUP_NOT_FOUND", "Pickup not found.", HTTP_STATUS.NOT_FOUND);
  if (pickup.pickupStatus !== PickupStatus.AT_HUB) {
    throw new AppError(
      "PICKUP_NOT_AT_HUB",
      "Only bags that are checked in at the hub can be inspected.",
      HTTP_STATUS.CONFLICT,
    );
  }
  if (
    pickup.items.some(
      ({ inspectionStatus }) => inspectionStatus !== ItemInspectionStatus.NOT_INSPECTED,
    )
  ) {
    throw new AppError(
      "PICKUP_ALREADY_INSPECTED",
      "This bag has already been inspected.",
      HTTP_STATUS.CONFLICT,
    );
  }
  return pickup;
};

const assertInspectionCoversPickup = (
  pickup: PickupForInspection,
  lines: RecordInspectionBody["lines"],
) => {
  const itemsById = new Map(pickup.items.map((item) => [item.id, item]));
  const coversEveryItemOnce =
    lines.length === pickup.items.length &&
    new Set(lines.map(({ orderItemId }) => orderItemId)).size === pickup.items.length;
  const hasImpossibleCount = lines.some(({ orderItemId, failedQty }) => {
    const item = itemsById.get(orderItemId);
    return !item || failedQty > item.qty - item.refundedQty;
  });
  if (!coversEveryItemOnce || hasImpossibleCount) {
    throw new AppError(
      "INSPECTION_DOES_NOT_MATCH_PICKUP",
      "Give a result for every item in the bag, and no more failed units than are in it.",
      HTTP_STATUS.BAD_REQUEST,
    );
  }
};

export const logisticsInspectionService = {
  async recordInspection(
    staffUserId: string,
    groupId: string,
    { lines, note }: RecordInspectionBody,
  ): Promise<PickupInspectionView> {
    const pickup = await requirePickupReadyForInspection(groupId);
    assertInspectionCoversPickup(pickup, lines);

    const failedLines = lines
      .filter(({ failedQty }) => failedQty > NO_UNITS)
      .map(({ orderItemId, failedQty }) => ({ orderItemId, qty: failedQty }));
    const refund =
      failedLines.length > NO_UNITS
        ? await orderService.refundOrderItems(
            staffUserId,
            pickup.orderId,
            {
              lines: failedLines,
              cause: OrderRefundCause.HUB_INSPECTION_FAILED,
              reason: note ?? DEFAULT_FAILED_INSPECTION_REASON,
              restock: false,
            },
            `${INSPECTION_REFUND_KEY_PREFIX}:${groupId}`,
          )
        : null;

    const outcome = await prisma.$transaction(async (tx) => {
      await logisticsHubOperationRepository.recordItemInspections(tx, lines);
      return logisticsTrackingService.recordEventInTransaction(tx, {
        subject: { kind: TRACKING_SUBJECT_KIND.PICKUP, fulfilmentGroupId: groupId },
        code: TrackingEventCode.INSPECTION_RECORDED,
        source: TrackingEventSource.HUB,
        actorUserId: staffUserId,
        dedupeKey: `${INSPECTION_DEDUPE_PREFIX}:${groupId}`,
        occurredAt: new Date(),
        ...(note ? { note } : {}),
      });
    });
    await logisticsTrackingService.announceStageChange(outcome);

    const inspectedPickup = await logisticsHubOperationRepository.findPickupForInspection(groupId);
    return {
      fulfilmentGroupId: groupId,
      orderId: pickup.orderId,
      failedUnits: failedLines.reduce((sum, { qty }) => sum + qty, NO_UNITS),
      refundId: refund?.id ?? null,
      pickupStatus: inspectedPickup?.pickupStatus ?? null,
    };
  },
};
