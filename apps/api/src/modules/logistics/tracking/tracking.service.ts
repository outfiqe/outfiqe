import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import type { Prisma } from "#generated/prisma/client.js";
import { PickupStatus } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";
import { orderRepository } from "#modules/orders/order.repository.js";

import { TRACKING_SUBJECT_KIND } from "./tracking.constants.js";
import {
  pickupStatusForEventCode,
  resolveCoarseGroupStatus,
  shipmentStatusForEventCode,
} from "./tracking.mapping.js";
import { logisticsTrackingRepository } from "./tracking.repository.js";
import { describeOrderTrackingStage, hasTrackingStageChanged } from "./tracking.stage.js";
import {
  canApplyStatusMove,
  PICKUP_STATUS_NEXT,
  SHIPMENT_STATUS_NEXT,
} from "./tracking.state-machine.js";
import type {
  RecordTrackingEventInput,
  RecordTrackingEventOutcome,
  TrackingSubject,
} from "./tracking.types.js";

const STATUS_MOVE_ATTEMPTS = 2;
const NO_ATTEMPTS_LEFT = 0;
const NEXT_ATTEMPT_STEP = 1;

type TransactionClient = Prisma.TransactionClient;

const throwSubjectNotFound = (): never => {
  throw new AppError(
    "TRACKING_SUBJECT_NOT_FOUND",
    "That pickup or parcel doesn't exist.",
    HTTP_STATUS.NOT_FOUND,
  );
};

const loadSubjectOrderId = async (
  tx: TransactionClient,
  subject: TrackingSubject,
): Promise<string> => {
  const loadedSubject =
    subject.kind === TRACKING_SUBJECT_KIND.PICKUP
      ? await logisticsTrackingRepository.findPickupSubject(tx, subject.fulfilmentGroupId)
      : await logisticsTrackingRepository.findShipmentSubject(tx, subject.shipmentId);
  return loadedSubject?.orderId ?? throwSubjectNotFound();
};

const toTrackingEventRow = (
  input: RecordTrackingEventInput,
): Prisma.TrackingEventUncheckedCreateInput => {
  const { subject, isCorrection = false, ...eventFields } = input;
  const subjectColumns =
    subject.kind === TRACKING_SUBJECT_KIND.PICKUP
      ? { fulfilmentGroupId: subject.fulfilmentGroupId }
      : { shipmentId: subject.shipmentId };
  return { ...eventFields, ...subjectColumns, isCorrection };
};

const tryMovePickupStatus = async (
  tx: TransactionClient,
  fulfilmentGroupId: string,
  input: RecordTrackingEventInput,
  attemptsLeft: number,
): Promise<boolean> => {
  const nextStatus = pickupStatusForEventCode(input.code);
  if (nextStatus === null || attemptsLeft === NO_ATTEMPTS_LEFT) return false;

  const pickup = await logisticsTrackingRepository.findPickupSubject(tx, fulfilmentGroupId);
  if (!pickup?.pickupStatus) return false;

  const canMove = canApplyStatusMove({
    currentStatus: pickup.pickupStatus,
    nextStatus,
    currentStatusChangedAt: pickup.pickupStatusChangedAt,
    occurredAt: input.occurredAt,
    isCorrection: input.isCorrection ?? false,
    allowedNextStatuses: PICKUP_STATUS_NEXT,
  });
  if (!canMove) return false;

  const hasMoved = await logisticsTrackingRepository.movePickupStatus(tx, {
    fulfilmentGroupId,
    fromStatus: pickup.pickupStatus,
    toStatus: nextStatus,
    coarseStatus: resolveCoarseGroupStatus({
      pickupStatus: nextStatus,
      shipmentStatus: pickup.shipment?.status ?? null,
      hasBeenInParcel: pickup.shipmentId !== null,
    }),
    changedAt: input.occurredAt,
  });
  return (
    hasMoved || tryMovePickupStatus(tx, fulfilmentGroupId, input, attemptsLeft - NEXT_ATTEMPT_STEP)
  );
};

const tryMoveShipmentStatus = async (
  tx: TransactionClient,
  shipmentId: string,
  input: RecordTrackingEventInput,
  attemptsLeft: number,
): Promise<boolean> => {
  const nextStatus = shipmentStatusForEventCode(input.code);
  if (nextStatus === null || attemptsLeft === NO_ATTEMPTS_LEFT) return false;

  const shipment = await logisticsTrackingRepository.findShipmentSubject(tx, shipmentId);
  if (!shipment) return false;

  const canMove = canApplyStatusMove({
    currentStatus: shipment.status,
    nextStatus,
    currentStatusChangedAt: shipment.statusChangedAt,
    occurredAt: input.occurredAt,
    isCorrection: input.isCorrection ?? false,
    allowedNextStatuses: SHIPMENT_STATUS_NEXT,
  });
  if (!canMove) return false;

  const hasMoved = await logisticsTrackingRepository.moveShipmentStatus(tx, {
    shipmentId,
    fromStatus: shipment.status,
    toStatus: nextStatus,
    changedAt: input.occurredAt,
  });
  if (!hasMoved) {
    return tryMoveShipmentStatus(tx, shipmentId, input, attemptsLeft - NEXT_ATTEMPT_STEP);
  }

  await logisticsTrackingRepository.setCoarseStatusForParcelGroups(
    tx,
    shipmentId,
    resolveCoarseGroupStatus({
      pickupStatus: PickupStatus.IN_PARCEL,
      shipmentStatus: nextStatus,
      hasBeenInParcel: true,
    }),
    input.occurredAt,
  );
  return true;
};

const applyStatusChange = async (
  tx: TransactionClient,
  input: RecordTrackingEventInput,
): Promise<boolean> => {
  const { subject } = input;
  if (subject.kind === TRACKING_SUBJECT_KIND.PICKUP) {
    return tryMovePickupStatus(tx, subject.fulfilmentGroupId, input, STATUS_MOVE_ATTEMPTS);
  }
  await logisticsTrackingRepository.setShipmentLastEventAt(tx, subject.shipmentId, new Date());
  return tryMoveShipmentStatus(tx, subject.shipmentId, input, STATUS_MOVE_ATTEMPTS);
};

const describeOrderStage = async (tx: TransactionClient, orderId: string) =>
  describeOrderTrackingStage(
    await logisticsTrackingRepository.listOrderGroupSnapshots(tx, orderId),
  );

const recordEventInTransaction = async (
  tx: TransactionClient,
  input: RecordTrackingEventInput,
): Promise<RecordTrackingEventOutcome> => {
  const orderId = await loadSubjectOrderId(tx, input.subject);
  const stageBefore = await describeOrderStage(tx, orderId);

  const insertedEvent = await logisticsTrackingRepository.insertTrackingEvent(
    tx,
    toTrackingEventRow(input),
  );
  if (!insertedEvent) {
    const existingEvent = await logisticsTrackingRepository.findTrackingEventByDedupeKey(
      tx,
      input.source,
      input.dedupeKey,
    );
    if (!existingEvent) return throwSubjectNotFound();
    const { userId, fulfilmentStatus } = await logisticsTrackingRepository.findOrderOwnerAndStatus(
      tx,
      orderId,
    );
    return {
      eventId: existingEvent.id,
      orderId,
      orderUserId: userId,
      orderFulfilmentStatus: fulfilmentStatus,
      wasDuplicate: true,
      appliedToStatus: existingEvent.appliedToStatus,
      stageBefore,
      stageAfter: stageBefore,
    };
  }

  const appliedToStatus = await applyStatusChange(tx, input);
  if (appliedToStatus) {
    await logisticsTrackingRepository.markTrackingEventApplied(tx, insertedEvent.id);
    await orderRepository.refreshOrderFulfilmentRollup(tx, orderId);
  }

  const { userId, fulfilmentStatus } = await logisticsTrackingRepository.findOrderOwnerAndStatus(
    tx,
    orderId,
  );
  return {
    eventId: insertedEvent.id,
    orderId,
    orderUserId: userId,
    orderFulfilmentStatus: fulfilmentStatus,
    wasDuplicate: false,
    appliedToStatus,
    stageBefore,
    stageAfter: await describeOrderStage(tx, orderId),
  };
};

const announceStageChange = async (outcome: RecordTrackingEventOutcome): Promise<void> => {
  const shouldAnnounce =
    outcome.appliedToStatus && hasTrackingStageChanged(outcome.stageBefore, outcome.stageAfter);
  if (!shouldAnnounce) return;

  await eventBus.publish(DomainEvents.ORDER_STATUS_CHANGED, {
    orderId: outcome.orderId,
    userId: outcome.orderUserId,
    status: outcome.orderFulfilmentStatus,
  });
};

export const logisticsTrackingService = {
  recordEventInTransaction,
  announceStageChange,

  async recordEvent(input: RecordTrackingEventInput): Promise<RecordTrackingEventOutcome> {
    const outcome = await prisma.$transaction((tx) => recordEventInTransaction(tx, input));
    await announceStageChange(outcome);
    return outcome;
  },
};
