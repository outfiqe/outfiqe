import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  RiderStatus,
  RiderTaskStatus,
  TrackingEventCode,
  TrackingEventSource,
} from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import type { DbClient } from "#types/db.types.js";

import { logisticsRiderRepository } from "../riders/rider.repository.js";
import { TRACKING_SUBJECT_KIND } from "../tracking/tracking.constants.js";
import { logisticsTrackingService } from "../tracking/tracking.service.js";
import { logisticsRoundRepository, OPEN_RIDER_TASK_STATUSES } from "./rounds.repository.js";
import type {
  AssignRiderTaskBody,
  ListRiderTasksQuery,
  PickupBoardQuery,
} from "./rounds.schemas.js";
import type { PickupBoardLocation, RiderTaskSummary } from "./rounds.types.js";
import { toPickupBoardLocation, toRiderTaskSummary } from "./rounds.utils.js";

const RIDER_ASSIGNED_DEDUPE_PREFIX = "rider-assigned";
const ASSIGNMENT_CANCELLED_DEDUPE_PREFIX = "assignment-cancelled";
const NO_STOPS_SCANNED = 0;

type TransactionClient = Prisma.TransactionClient;

const pickupsNotAssignableError = () =>
  new AppError(
    "PICKUPS_NOT_ASSIGNABLE",
    "Some of these pickups are no longer waiting for a rider. Refresh the board and try again.",
    HTTP_STATUS.CONFLICT,
  );

const requireAssignableRider = async (riderId: string) => {
  const rider = await logisticsRiderRepository.findRiderById(riderId);
  if (!rider) throw new AppError("RIDER_NOT_FOUND", "Rider not found.", HTTP_STATUS.NOT_FOUND);
  if (rider.status !== RiderStatus.ACTIVE) {
    throw new AppError(
      "RIDER_NOT_ACTIVE",
      "Only active riders can be given visits.",
      HTTP_STATUS.CONFLICT,
    );
  }
  return rider;
};

const recordAssignmentEvents = async (
  tx: TransactionClient,
  params: { taskId: string; fulfilmentGroupIds: string[]; assignedById: string; riderName: string },
) => {
  const occurredAt = new Date();
  for (const fulfilmentGroupId of params.fulfilmentGroupIds) {
    await logisticsTrackingService.recordEventInTransaction(tx, {
      subject: { kind: TRACKING_SUBJECT_KIND.PICKUP, fulfilmentGroupId },
      code: TrackingEventCode.RIDER_ASSIGNED,
      source: TrackingEventSource.HUB,
      actorUserId: params.assignedById,
      dedupeKey: `${RIDER_ASSIGNED_DEDUPE_PREFIX}:${params.taskId}:${fulfilmentGroupId}`,
      occurredAt,
      note: `Assigned to ${params.riderName}`,
    });
  }
};

const requireTaskSummary = async (client: DbClient, taskId: string) => {
  const task = await logisticsRoundRepository.findRiderTaskSummary(client, taskId);
  if (!task) throw new AppError("RIDER_TASK_NOT_FOUND", "Visit not found.", HTTP_STATUS.NOT_FOUND);
  return task;
};

export const logisticsRoundService = {
  async listPickupBoard(
    query: PickupBoardQuery,
  ): Promise<{ items: PickupBoardLocation[]; nextCursor: string | null }> {
    const locations = await logisticsRoundRepository.listPickupBoardLocations(query);
    const { items, nextCursor } = buildCursorPage(
      locations,
      query.limit,
      (location) => location.id,
    );
    return { items: items.map(toPickupBoardLocation), nextCursor };
  },

  async assignRiderTask(
    body: AssignRiderTaskBody,
    assignedById: string,
  ): Promise<RiderTaskSummary> {
    const { riderId, pickupLocationId, fulfilmentGroupIds, roundStartsAt } = body;
    const rider = await requireAssignableRider(riderId);
    const pickupLocation = await logisticsRoundRepository.findPickupLocationBrand(pickupLocationId);
    if (!pickupLocation) {
      throw new AppError(
        "PICKUP_LOCATION_NOT_FOUND",
        "Pickup location not found.",
        HTTP_STATUS.NOT_FOUND,
      );
    }

    try {
      const taskId = await prisma.$transaction(async (tx) => {
        const collectableCount = await logisticsRoundRepository.countCollectableGroups(tx, {
          hubId: rider.hubId,
          pickupLocationId,
          fulfilmentGroupIds,
        });
        if (collectableCount !== fulfilmentGroupIds.length) throw pickupsNotAssignableError();

        const { id } = await logisticsRoundRepository.createRiderTask(tx, {
          riderId,
          hubId: rider.hubId,
          brandId: pickupLocation.brandId,
          pickupLocationId,
          roundStartsAt,
          assignedById,
          fulfilmentGroupIds,
        });
        await recordAssignmentEvents(tx, {
          taskId: id,
          fulfilmentGroupIds,
          assignedById,
          riderName: rider.user.name,
        });
        return id;
      });
      return toRiderTaskSummary(await requireTaskSummary(prisma, taskId));
    } catch (error) {
      if (isUniqueConstraintError(error)) throw pickupsNotAssignableError();
      throw error;
    }
  },

  async listRiderTasks(
    query: ListRiderTasksQuery,
  ): Promise<{ items: RiderTaskSummary[]; nextCursor: string | null }> {
    const tasks = await logisticsRoundRepository.listRiderTasks(query);
    const { items, nextCursor } = buildCursorPage(tasks, query.limit, (task) => task.id);
    return { items: items.map(toRiderTaskSummary), nextCursor };
  },

  async cancelRiderTask(taskId: string, cancelledById: string): Promise<RiderTaskSummary> {
    await prisma.$transaction(async (tx) => {
      await requireTaskSummary(tx, taskId);
      const { scannedStopCount } = await logisticsRoundRepository.countStops(tx, taskId);
      if (scannedStopCount > NO_STOPS_SCANNED) {
        throw new AppError(
          "RIDER_TASK_ALREADY_STARTED",
          "The rider has already collected bags on this visit, so it can't be cancelled.",
          HTTP_STATUS.CONFLICT,
        );
      }

      const releasedGroupIds = await logisticsRoundRepository.listUnscannedStopGroupIds(tx, taskId);
      const hasMoved = await logisticsRoundRepository.moveTaskStatus(tx, taskId, {
        fromStatuses: OPEN_RIDER_TASK_STATUSES,
        toStatus: RiderTaskStatus.CANCELLED,
      });
      if (!hasMoved) {
        throw new AppError(
          "RIDER_TASK_CLOSED",
          "This visit is already finished.",
          HTTP_STATUS.CONFLICT,
        );
      }
      await logisticsRoundRepository.releaseUnscannedStops(tx, taskId);

      const occurredAt = new Date();
      for (const fulfilmentGroupId of releasedGroupIds) {
        await logisticsTrackingService.recordEventInTransaction(tx, {
          subject: { kind: TRACKING_SUBJECT_KIND.PICKUP, fulfilmentGroupId },
          code: TrackingEventCode.NOTE,
          source: TrackingEventSource.HUB,
          actorUserId: cancelledById,
          dedupeKey: `${ASSIGNMENT_CANCELLED_DEDUPE_PREFIX}:${taskId}:${fulfilmentGroupId}`,
          occurredAt,
          note: "Rider visit cancelled; pickup is back on the board",
        });
      }
    });
    return toRiderTaskSummary(await requireTaskSummary(prisma, taskId));
  },
};
