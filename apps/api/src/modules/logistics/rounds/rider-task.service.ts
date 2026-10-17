import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  BrandIncidentKind,
  BrandReturnSource,
  PickupStatus,
  RiderTaskStatus,
  TrackingEventCode,
  TrackingEventSource,
} from "#generated/prisma/enums.js";
import { withIdempotency } from "#lib/idempotency.utils.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { logisticsBagTagRepository } from "../bag-tags/bag-tag.repository.js";
import { requireActiveRider } from "../logistics.guards.js";
import { brandIncidentRepository } from "../reliability/brand-incident.repository.js";
import { TRACKING_SUBJECT_KIND } from "../tracking/tracking.constants.js";
import { logisticsTrackingService } from "../tracking/tracking.service.js";
import type { RecordTrackingEventOutcome, TrackingSubject } from "../tracking/tracking.types.js";
import { logisticsRoundRepository, OPEN_RIDER_TASK_STATUSES } from "./rounds.repository.js";
import type { CollectScanBody, ReturnDropOffBody, WastedVisitBody } from "./rounds.schemas.js";
import type { RiderTaskView } from "./rounds.types.js";
import { resolveScanOccurredAt, SCAN_TIME_VERDICT, toRiderTaskView } from "./rounds.utils.js";

const COLLECT_SCAN_IDEMPOTENCY_ENDPOINT = "logistics:rider-collect-scan";
const PICKED_UP_DEDUPE_PREFIX = "picked-up";
const BAG_TAGGED_DEDUPE_PREFIX = "bag-tagged";
const VISIT_WASTED_DEDUPE_PREFIX = "visit-wasted";
const VISIT_FINISHED_DEDUPE_PREFIX = "visit-finished-uncollected";
const RETURN_DROPPED_OFF_DEDUPE_PREFIX = "return-dropped-off";
const NO_STOPS_SCANNED = 0;

type TransactionClient = Prisma.TransactionClient;
type RiderIdentity = { riderId: string; userId: string };

const riderTaskNotFoundError = () =>
  new AppError("RIDER_TASK_NOT_FOUND", "Visit not found.", HTTP_STATUS.NOT_FOUND);

const riderTaskClosedError = () =>
  new AppError("RIDER_TASK_CLOSED", "This visit is already finished.", HTTP_STATUS.CONFLICT);

const bagTagAlreadyUsedError = () =>
  new AppError(
    "BAG_TAG_ALREADY_USED",
    "This sticker is already on another bag. Use a new sticker.",
    HTTP_STATUS.CONFLICT,
  );

const pickupAlreadyCollectedError = () =>
  new AppError(
    "PICKUP_ALREADY_COLLECTED",
    "This bag was already collected with a different sticker.",
    HTTP_STATUS.CONFLICT,
  );

const requireOpenTask = async (tx: TransactionClient, taskId: string, riderId: string) => {
  const task = await logisticsRoundRepository.findRiderTaskDetail(tx, taskId, riderId);
  if (!task) throw riderTaskNotFoundError();
  if (!OPEN_RIDER_TASK_STATUSES.includes(task.status)) throw riderTaskClosedError();
  return task;
};

const requireRiderTaskView = async (taskId: string, riderId: string): Promise<RiderTaskView> => {
  const task = await logisticsRoundRepository.findRiderTaskDetail(prisma, taskId, riderId);
  if (!task) throw riderTaskNotFoundError();
  return toRiderTaskView(task);
};

const requireCollectableStop = async (
  tx: TransactionClient,
  taskId: string,
  pickupCode: string,
) => {
  const stop = await logisticsRoundRepository.findActiveCollectStopByPickupCode(
    tx,
    taskId,
    pickupCode,
  );
  if (!stop) {
    throw new AppError(
      "PICKUP_NOT_ON_TASK",
      "This pickup code isn't part of this visit.",
      HTTP_STATUS.NOT_FOUND,
    );
  }
  return stop;
};

const requireFreeBagTagForHub = async (
  tx: TransactionClient,
  bagTagCode: string,
  hubId: string,
) => {
  const bagTag = await logisticsBagTagRepository.findBagTagByCode(tx, bagTagCode);
  if (!bagTag) {
    throw new AppError("BAG_TAG_NOT_FOUND", "We don't know this sticker.", HTTP_STATUS.NOT_FOUND);
  }
  if (bagTag.batch.hubId !== hubId) {
    throw new AppError(
      "BAG_TAG_WRONG_HUB",
      "This sticker belongs to a different hub.",
      HTTP_STATUS.CONFLICT,
    );
  }
  if (bagTag.fulfilmentGroupId !== null) throw bagTagAlreadyUsedError();
  return bagTag;
};

const resolveAcceptedScanTime = (deviceScannedAt: Date, pickupStatusChangedAt: Date | null) => {
  const resolution = resolveScanOccurredAt({
    deviceScannedAt,
    pickupStatusChangedAt,
    now: new Date(),
  });
  if (resolution.verdict === SCAN_TIME_VERDICT.TOO_OLD) {
    throw new AppError(
      "SCAN_TOO_OLD",
      "This scan is too old to record. Hand the bag to the hub team and tell them.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    );
  }
  return resolution.occurredAt;
};

const closeTaskIfFullyCollected = async (tx: TransactionClient, taskId: string) => {
  const { activeStopCount, scannedStopCount } = await logisticsRoundRepository.countStops(
    tx,
    taskId,
  );
  const isFullyCollected = scannedStopCount === activeStopCount;
  await logisticsRoundRepository.moveTaskStatus(tx, taskId, {
    fromStatuses: OPEN_RIDER_TASK_STATUSES,
    toStatus: isFullyCollected ? RiderTaskStatus.COMPLETED : RiderTaskStatus.IN_PROGRESS,
    ...(isFullyCollected ? { completedAt: new Date() } : {}),
  });
};

const collectBagInTransaction = async (
  tx: TransactionClient,
  { riderId, userId, hubId }: RiderIdentity & { hubId: string },
  taskId: string,
  { pickupCode, bagTagCode, scannedAt }: CollectScanBody,
): Promise<RecordTrackingEventOutcome | null> => {
  const task = await logisticsRoundRepository.findRiderTaskDetail(tx, taskId, riderId);
  if (!task) throw riderTaskNotFoundError();
  const stop = await requireCollectableStop(tx, taskId, pickupCode);
  const { fulfilmentGroupId, fulfilmentGroup } = stop;

  if (stop.scannedAt !== null) {
    if (fulfilmentGroup.bagTag?.code === bagTagCode) return null;
    throw pickupAlreadyCollectedError();
  }
  if (!OPEN_RIDER_TASK_STATUSES.includes(task.status)) throw riderTaskClosedError();
  if (fulfilmentGroup.pickupStatus !== PickupStatus.READY_FOR_PICKUP) {
    throw new AppError(
      "PICKUP_NOT_READY",
      "This order was cancelled or changed. Don't take this bag.",
      HTTP_STATUS.CONFLICT,
    );
  }

  const bagTag = await requireFreeBagTagForHub(tx, bagTagCode, hubId);
  const occurredAt = resolveAcceptedScanTime(scannedAt, fulfilmentGroup.pickupStatusChangedAt);

  const isAttached = await logisticsBagTagRepository.attachBagTag(tx, {
    bagTagId: bagTag.id,
    fulfilmentGroupId,
    riderId,
    attachedAt: occurredAt,
  });
  if (!isAttached) throw bagTagAlreadyUsedError();
  if (!(await logisticsRoundRepository.markStopScanned(tx, stop.id, occurredAt))) {
    throw pickupAlreadyCollectedError();
  }

  const subject: TrackingSubject = { kind: TRACKING_SUBJECT_KIND.PICKUP, fulfilmentGroupId };
  const pickedUpOutcome = await logisticsTrackingService.recordEventInTransaction(tx, {
    subject,
    code: TrackingEventCode.PICKED_UP,
    source: TrackingEventSource.RIDER,
    actorUserId: userId,
    dedupeKey: `${PICKED_UP_DEDUPE_PREFIX}:${fulfilmentGroupId}`,
    occurredAt,
  });
  await logisticsTrackingService.recordEventInTransaction(tx, {
    subject,
    code: TrackingEventCode.BAG_TAGGED,
    source: TrackingEventSource.RIDER,
    actorUserId: userId,
    dedupeKey: `${BAG_TAGGED_DEDUPE_PREFIX}:${fulfilmentGroupId}`,
    occurredAt,
    note: `Bag sticker ${bagTagCode}`,
  });
  await closeTaskIfFullyCollected(tx, taskId);
  return pickedUpOutcome;
};

const collectBagOnce = async (
  userId: string,
  taskId: string,
  scan: CollectScanBody,
): Promise<RiderTaskView> => {
  const rider = await requireActiveRider(userId);
  try {
    const pickedUpOutcome = await prisma.$transaction((tx) =>
      collectBagInTransaction(tx, { riderId: rider.id, userId, hubId: rider.hubId }, taskId, scan),
    );
    if (pickedUpOutcome) await logisticsTrackingService.announceStageChange(pickedUpOutcome);
  } catch (error) {
    if (isUniqueConstraintError(error)) throw bagTagAlreadyUsedError();
    throw error;
  }
  return requireRiderTaskView(taskId, rider.id);
};

const recordUncollectedStops = async (
  tx: TransactionClient,
  params: {
    taskId: string;
    userId: string;
    code: TrackingEventCode;
    dedupePrefix: string;
    note: string;
  },
) => {
  const uncollectedGroupIds = await logisticsRoundRepository.listUnscannedStopGroupIds(
    tx,
    params.taskId,
  );
  const occurredAt = new Date();
  for (const fulfilmentGroupId of uncollectedGroupIds) {
    await logisticsTrackingService.recordEventInTransaction(tx, {
      subject: { kind: TRACKING_SUBJECT_KIND.PICKUP, fulfilmentGroupId },
      code: params.code,
      source: TrackingEventSource.RIDER,
      actorUserId: params.userId,
      dedupeKey: `${params.dedupePrefix}:${params.taskId}:${fulfilmentGroupId}`,
      occurredAt,
      note: params.note,
    });
  }
  await logisticsRoundRepository.releaseUnscannedStops(tx, params.taskId);
};

export const logisticsRiderTaskService = {
  async listOpenRiderTasks(userId: string): Promise<RiderTaskView[]> {
    const rider = await requireActiveRider(userId);
    const tasks = await logisticsRoundRepository.listOpenTasksForRider(rider.id);
    return tasks.map(toRiderTaskView);
  },

  async getRiderTask(userId: string, taskId: string): Promise<RiderTaskView> {
    const rider = await requireActiveRider(userId);
    return requireRiderTaskView(taskId, rider.id);
  },

  collectBag(
    userId: string,
    taskId: string,
    scan: CollectScanBody,
    idempotencyKey: string,
  ): Promise<RiderTaskView> {
    return withIdempotency(
      userId,
      COLLECT_SCAN_IDEMPOTENCY_ENDPOINT,
      idempotencyKey,
      () => collectBagOnce(userId, taskId, scan),
      { taskId, ...scan },
    );
  },

  async dropOffReturn(
    userId: string,
    taskId: string,
    { brandReturnId }: ReturnDropOffBody,
  ): Promise<RiderTaskView> {
    const rider = await requireActiveRider(userId);
    const pickupOutcome = await prisma.$transaction(async (tx) => {
      await requireOpenTask(tx, taskId, rider.id);
      const stop = await logisticsRoundRepository.findActiveReturnStop(tx, taskId, brandReturnId);
      if (!stop) {
        throw new AppError(
          "RETURN_NOT_ON_VISIT",
          "This return isn't on your visit.",
          HTTP_STATUS.NOT_FOUND,
        );
      }
      if (stop.scannedAt !== null) return null;

      const droppedOffAt = new Date();
      const isStopScanned = await logisticsRoundRepository.markStopScanned(
        tx,
        stop.id,
        droppedOffAt,
      );
      const isDroppedOff = await logisticsRoundRepository.markReturnDroppedOff(
        tx,
        brandReturnId,
        droppedOffAt,
      );
      if (!isStopScanned || !isDroppedOff) return null;

      const returnedParcelPickup =
        stop.brandReturn?.source === BrandReturnSource.PARCEL_RETURNED
          ? await logisticsTrackingService.recordEventInTransaction(tx, {
              subject: {
                kind: TRACKING_SUBJECT_KIND.PICKUP,
                fulfilmentGroupId: stop.fulfilmentGroupId,
              },
              code: TrackingEventCode.RETURNING_TO_BRAND,
              source: TrackingEventSource.RIDER,
              actorUserId: userId,
              dedupeKey: `${RETURN_DROPPED_OFF_DEDUPE_PREFIX}:${brandReturnId}`,
              occurredAt: droppedOffAt,
            })
          : null;
      await closeTaskIfFullyCollected(tx, taskId);
      return returnedParcelPickup;
    });
    if (pickupOutcome) await logisticsTrackingService.announceStageChange(pickupOutcome);
    return requireRiderTaskView(taskId, rider.id);
  },

  async markVisitWasted(
    userId: string,
    taskId: string,
    { reason }: WastedVisitBody,
  ): Promise<RiderTaskView> {
    const rider = await requireActiveRider(userId);
    await prisma.$transaction(async (tx) => {
      const { brandId } = await requireOpenTask(tx, taskId, rider.id);
      const { scannedStopCount } = await logisticsRoundRepository.countStops(tx, taskId);
      if (scannedStopCount > NO_STOPS_SCANNED) {
        throw new AppError(
          "VISIT_HAS_COLLECTIONS",
          "You already collected bags here. Finish the visit instead.",
          HTTP_STATUS.CONFLICT,
        );
      }
      await recordUncollectedStops(tx, {
        taskId,
        userId,
        code: TrackingEventCode.VISIT_WASTED,
        dedupePrefix: VISIT_WASTED_DEDUPE_PREFIX,
        note: reason,
      });
      const hasMoved = await logisticsRoundRepository.moveTaskStatus(tx, taskId, {
        fromStatuses: OPEN_RIDER_TASK_STATUSES,
        toStatus: RiderTaskStatus.WASTED,
        completedAt: new Date(),
        wastedReason: reason,
      });
      if (!hasMoved) throw riderTaskClosedError();
      await brandIncidentRepository.recordIncidents(tx, [
        {
          brandId,
          kind: BrandIncidentKind.WASTED_VISIT,
          sourceKey: taskId,
          orderId: null,
          note: reason,
          occurredAt: new Date(),
        },
      ]);
    });
    return requireRiderTaskView(taskId, rider.id);
  },

  async finishVisit(userId: string, taskId: string): Promise<RiderTaskView> {
    const rider = await requireActiveRider(userId);
    await prisma.$transaction(async (tx) => {
      await requireOpenTask(tx, taskId, rider.id);
      const { scannedStopCount } = await logisticsRoundRepository.countStops(tx, taskId);
      if (scannedStopCount === NO_STOPS_SCANNED) {
        throw new AppError(
          "VISIT_HAS_NO_COLLECTIONS",
          "Nothing was collected. Mark the visit as wasted instead.",
          HTTP_STATUS.CONFLICT,
        );
      }
      await recordUncollectedStops(tx, {
        taskId,
        userId,
        code: TrackingEventCode.NOTE,
        dedupePrefix: VISIT_FINISHED_DEDUPE_PREFIX,
        note: "Not ready when the rider visited; back on the pickup board",
      });
      const hasMoved = await logisticsRoundRepository.moveTaskStatus(tx, taskId, {
        fromStatuses: OPEN_RIDER_TASK_STATUSES,
        toStatus: RiderTaskStatus.COMPLETED,
        completedAt: new Date(),
      });
      if (!hasMoved) throw riderTaskClosedError();
    });
    return requireRiderTaskView(taskId, rider.id);
  },
};
