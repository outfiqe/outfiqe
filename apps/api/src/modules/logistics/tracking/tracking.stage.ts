import { FulfilmentMode, PickupStatus, ShipmentStatus } from "#generated/prisma/enums.js";

import { ORDER_TRACKING_STAGE, type OrderTrackingStage } from "./tracking.constants.js";
import { isReturnPickupStatus } from "./tracking.mapping.js";
import type { OrderTrackingStageSummary, TrackedGroupSnapshot } from "./tracking.types.js";

const FORWARD_STAGE_PROGRESS: Partial<Record<OrderTrackingStage, number>> = {
  [ORDER_TRACKING_STAGE.ORDER_PLACED]: 0,
  [ORDER_TRACKING_STAGE.COLLECTING_ITEMS]: 1,
  [ORDER_TRACKING_STAGE.AT_HUB]: 2,
  [ORDER_TRACKING_STAGE.PACKED]: 3,
  [ORDER_TRACKING_STAGE.ON_ITS_WAY]: 4,
  [ORDER_TRACKING_STAGE.DELIVERY_ATTEMPT_FAILED]: 5,
  [ORDER_TRACKING_STAGE.OUT_FOR_DELIVERY]: 6,
  [ORDER_TRACKING_STAGE.DELIVERED]: 7,
};

const STAGE_BY_SHIPMENT_STATUS: Record<ShipmentStatus, OrderTrackingStage> = {
  [ShipmentStatus.PACKED]: ORDER_TRACKING_STAGE.PACKED,
  [ShipmentStatus.HANDED_TO_PARTNER]: ORDER_TRACKING_STAGE.ON_ITS_WAY,
  [ShipmentStatus.IN_TRANSIT]: ORDER_TRACKING_STAGE.ON_ITS_WAY,
  [ShipmentStatus.OUT_FOR_DELIVERY]: ORDER_TRACKING_STAGE.OUT_FOR_DELIVERY,
  [ShipmentStatus.DELIVERY_FAILED]: ORDER_TRACKING_STAGE.DELIVERY_ATTEMPT_FAILED,
  [ShipmentStatus.DELIVERED]: ORDER_TRACKING_STAGE.DELIVERED,
  [ShipmentStatus.RETURNING]: ORDER_TRACKING_STAGE.RETURNING,
  [ShipmentStatus.RETURNED_TO_HUB]: ORDER_TRACKING_STAGE.RETURNING,
  [ShipmentStatus.CANCELLED]: ORDER_TRACKING_STAGE.AT_HUB,
  [ShipmentStatus.LOST]: ORDER_TRACKING_STAGE.CANCELLED,
};

const STAGE_BY_PRE_PARCEL_PICKUP_STATUS: Partial<Record<PickupStatus, OrderTrackingStage>> = {
  [PickupStatus.AWAITING_BRAND]: ORDER_TRACKING_STAGE.ORDER_PLACED,
  [PickupStatus.READY_FOR_PICKUP]: ORDER_TRACKING_STAGE.COLLECTING_ITEMS,
  [PickupStatus.PICKED_UP]: ORDER_TRACKING_STAGE.COLLECTING_ITEMS,
  [PickupStatus.AT_HUB]: ORDER_TRACKING_STAGE.AT_HUB,
  [PickupStatus.CANCELLED]: ORDER_TRACKING_STAGE.CANCELLED,
};

const COLLECTED_PICKUP_STATUSES: ReadonlySet<PickupStatus> = new Set([
  PickupStatus.PICKED_UP,
  PickupStatus.AT_HUB,
  PickupStatus.IN_PARCEL,
]);

type TrackedLogisticsGroup = TrackedGroupSnapshot & { pickupStatus: PickupStatus };

const isLogisticsGroup = (group: TrackedGroupSnapshot): group is TrackedLogisticsGroup =>
  group.fulfilmentMode === FulfilmentMode.OUTFIQE_LOGISTICS && group.pickupStatus !== null;

const stageForGroup = ({
  pickupStatus,
  shipmentStatus,
  hasBeenInParcel,
}: TrackedLogisticsGroup): OrderTrackingStage => {
  if (isReturnPickupStatus(pickupStatus)) {
    return hasBeenInParcel ? ORDER_TRACKING_STAGE.RETURNING : ORDER_TRACKING_STAGE.CANCELLED;
  }
  if (pickupStatus === PickupStatus.IN_PARCEL) {
    return shipmentStatus === null
      ? ORDER_TRACKING_STAGE.PACKED
      : STAGE_BY_SHIPMENT_STATUS[shipmentStatus];
  }
  return STAGE_BY_PRE_PARCEL_PICKUP_STATUS[pickupStatus] ?? ORDER_TRACKING_STAGE.ORDER_PLACED;
};

type ForwardGroupStage = {
  group: TrackedLogisticsGroup;
  stage: OrderTrackingStage;
  progress: number;
};

const toForwardGroupStage = (group: TrackedLogisticsGroup): ForwardGroupStage | null => {
  const stage = stageForGroup(group);
  const progress = FORWARD_STAGE_PROGRESS[stage];
  return progress === undefined ? null : { group, stage, progress };
};

const isForwardGroupStage = (candidate: ForwardGroupStage | null): candidate is ForwardGroupStage =>
  candidate !== null;

const pickLeastProgressed = (forwardGroupStages: readonly ForwardGroupStage[]): ForwardGroupStage =>
  forwardGroupStages.reduce((slowest, candidate) =>
    candidate.progress < slowest.progress ? candidate : slowest,
  );

export const describeOrderTrackingStage = (
  groups: readonly TrackedGroupSnapshot[],
): OrderTrackingStageSummary | null => {
  const logisticsGroups = groups.filter(isLogisticsGroup);
  if (logisticsGroups.length === 0) return null;

  const forwardGroupStages = logisticsGroups.map(toForwardGroupStage).filter(isForwardGroupStage);
  const collectedBrandCount = forwardGroupStages.filter(({ group }) =>
    COLLECTED_PICKUP_STATUSES.has(group.pickupStatus),
  ).length;
  const totalBrandCount = forwardGroupStages.length;

  if (forwardGroupStages.length > 0) {
    return {
      stage: pickLeastProgressed(forwardGroupStages).stage,
      collectedBrandCount,
      totalBrandCount,
    };
  }

  const groupStages = logisticsGroups.map((group) => ({ group, stage: stageForGroup(group) }));

  const isAnyGroupReturning = groupStages.some(
    ({ stage }) => stage === ORDER_TRACKING_STAGE.RETURNING,
  );
  return {
    stage: isAnyGroupReturning ? ORDER_TRACKING_STAGE.RETURNING : ORDER_TRACKING_STAGE.CANCELLED,
    collectedBrandCount,
    totalBrandCount,
  };
};

export const hasTrackingStageChanged = (
  stageBefore: OrderTrackingStageSummary | null,
  stageAfter: OrderTrackingStageSummary | null,
): boolean =>
  stageBefore?.stage !== stageAfter?.stage ||
  stageBefore?.collectedBrandCount !== stageAfter?.collectedBrandCount;
