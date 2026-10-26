import { BAG_TAG_CODE_LENGTH, normalizeTypedCode, PICKUP_CODE_LENGTH } from "@outfiqe/utils";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { PickupStatus, TrackingEventCode, TrackingEventSource } from "#generated/prisma/enums.js";
import { withIdempotency } from "#lib/idempotency.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { TRACKING_SUBJECT_KIND } from "../tracking/tracking.constants.js";
import { logisticsTrackingService } from "../tracking/tracking.service.js";
import {
  logisticsHubOperationRepository,
  type PickupForCheckIn,
} from "./hub-operation.repository.js";
import type { CheckInPickupBody } from "./hub-operation.schemas.js";
import type { PickupCheckInView } from "./hub-operation.types.js";

const CHECK_IN_IDEMPOTENCY_ENDPOINT = "logistics:hub-check-in";
const CHECK_IN_DEDUPE_PREFIX = "hub-check-in";
const COUNT_MISMATCH_DEDUPE_PREFIX = "hub-count-mismatch";
const NO_UNITS = 0;

const codeNotRecognisedError = () =>
  new AppError(
    "CODE_NOT_RECOGNISED",
    "That isn't a bag sticker or pickup code we know. Check the code and try again.",
    HTTP_STATUS.NOT_FOUND,
  );

const stickerNotOnABagError = () =>
  new AppError(
    "STICKER_NOT_ON_A_BAG",
    "This sticker isn't on any bag yet. Check you're scanning the sticker on the bag, or use its pickup code.",
    HTTP_STATUS.NOT_FOUND,
  );

const findPickupByStickerCode = async (stickerCode: string): Promise<PickupForCheckIn | null> => {
  const bagTag = await logisticsHubOperationRepository.findBagTagForCheckIn(stickerCode);
  if (!bagTag) return null;
  if (!bagTag.fulfilmentGroup) throw stickerNotOnABagError();
  return bagTag.fulfilmentGroup;
};

const findPickupByScannedCode = async (scannedCode: string): Promise<PickupForCheckIn | null> => {
  const code = normalizeTypedCode(scannedCode);
  if (code.length === BAG_TAG_CODE_LENGTH) return findPickupByStickerCode(code);
  if (code.length === PICKUP_CODE_LENGTH) {
    return logisticsHubOperationRepository.findPickupByPickupCode(code);
  }
  return null;
};

const countExpectedUnits = ({ items }: PickupForCheckIn) =>
  items.reduce((sum, { qty, refundedQty }) => sum + qty - refundedQty, NO_UNITS);

const toCheckInView = (
  pickup: PickupForCheckIn,
  countedUnits: number,
  pickupStatus: PickupStatus | null,
): PickupCheckInView => {
  const expectedUnits = countExpectedUnits(pickup);
  return {
    fulfilmentGroupId: pickup.id,
    orderId: pickup.orderId,
    brandName: pickup.brand.name,
    pickupStatus,
    expectedUnits,
    countedUnits,
    hasCountMismatch: countedUnits !== expectedUnits,
  };
};

const checkInOnce = async (
  staffUserId: string,
  { hubId, code, countedUnits }: CheckInPickupBody,
): Promise<PickupCheckInView> => {
  const pickup = await findPickupByScannedCode(code);
  if (!pickup) throw codeNotRecognisedError();
  if (pickup.hubId !== hubId) {
    throw new AppError(
      "PICKUP_FOR_ANOTHER_HUB",
      "This bag belongs to a different hub.",
      HTTP_STATUS.CONFLICT,
    );
  }
  if (pickup.pickupStatus === PickupStatus.AT_HUB) {
    return toCheckInView(pickup, countedUnits, pickup.pickupStatus);
  }
  if (pickup.pickupStatus !== PickupStatus.PICKED_UP) {
    throw new AppError(
      "PICKUP_NOT_ON_ITS_WAY",
      "This bag hasn't been collected by a rider, so it can't be checked in.",
      HTTP_STATUS.CONFLICT,
    );
  }

  const occurredAt = new Date();
  const hasCountMismatch = countedUnits !== countExpectedUnits(pickup);
  const subject = { kind: TRACKING_SUBJECT_KIND.PICKUP, fulfilmentGroupId: pickup.id } as const;
  const outcome = await prisma.$transaction(async (tx) => {
    const checkInOutcome = await logisticsTrackingService.recordEventInTransaction(tx, {
      subject,
      code: TrackingEventCode.AT_HUB,
      source: TrackingEventSource.HUB,
      actorUserId: staffUserId,
      dedupeKey: `${CHECK_IN_DEDUPE_PREFIX}:${pickup.id}`,
      occurredAt,
    });
    if (hasCountMismatch) {
      await logisticsTrackingService.recordEventInTransaction(tx, {
        subject,
        code: TrackingEventCode.COUNT_MISMATCH,
        source: TrackingEventSource.HUB,
        actorUserId: staffUserId,
        dedupeKey: `${COUNT_MISMATCH_DEDUPE_PREFIX}:${pickup.id}`,
        occurredAt,
        note: `Counted ${countedUnits} of ${countExpectedUnits(pickup)} units at check-in.`,
      });
    }
    return checkInOutcome;
  });
  await logisticsTrackingService.announceStageChange(outcome);

  return toCheckInView(
    pickup,
    countedUnits,
    outcome.appliedToStatus ? PickupStatus.AT_HUB : pickup.pickupStatus,
  );
};

export const logisticsCheckInService = {
  checkInPickup(
    staffUserId: string,
    body: CheckInPickupBody,
    idempotencyKey: string,
  ): Promise<PickupCheckInView> {
    return withIdempotency(
      staffUserId,
      CHECK_IN_IDEMPOTENCY_ENDPOINT,
      idempotencyKey,
      () => checkInOnce(staffUserId, body),
      body,
    );
  },
};
