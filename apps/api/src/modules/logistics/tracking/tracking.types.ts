import type { Prisma } from "#generated/prisma/client.js";
import type {
  DeliveryFailureReason,
  FulfilmentMode,
  FulfilmentStatus,
  PickupStatus,
  ShipmentStatus,
  TrackingEventCode,
  TrackingEventSource,
} from "#generated/prisma/enums.js";

import type { OrderTrackingStage, TRACKING_SUBJECT_KIND } from "./tracking.constants.js";

export type TrackingSubject =
  | { kind: typeof TRACKING_SUBJECT_KIND.PICKUP; fulfilmentGroupId: string }
  | { kind: typeof TRACKING_SUBJECT_KIND.SHIPMENT; shipmentId: string };

export type RecordTrackingEventInput = {
  subject: TrackingSubject;
  code: TrackingEventCode;
  source: TrackingEventSource;
  dedupeKey: string;
  occurredAt: Date;
  actorUserId?: string;
  partnerId?: string;
  rawStatus?: string;
  rawPayload?: Prisma.InputJsonValue;
  reasonCode?: DeliveryFailureReason;
  location?: string;
  note?: string;
  isCorrection?: boolean;
  codCollectedAmount?: number;
};

export type OrderTrackingStageSummary = {
  stage: OrderTrackingStage;
  collectedBrandCount: number;
  totalBrandCount: number;
};

export type RecordTrackingEventOutcome = {
  eventId: string;
  orderId: string;
  orderUserId: string;
  orderFulfilmentStatus: FulfilmentStatus;
  wasDuplicate: boolean;
  appliedToStatus: boolean;
  stageBefore: OrderTrackingStageSummary | null;
  stageAfter: OrderTrackingStageSummary | null;
};

export type TrackedGroupSnapshot = {
  fulfilmentMode: FulfilmentMode;
  pickupStatus: PickupStatus | null;
  shipmentStatus: ShipmentStatus | null;
  hasBeenInParcel: boolean;
};
