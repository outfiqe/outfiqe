import type {
  DeliveryFailureReason,
  ShipmentStatus,
  TrackingEventCode,
} from "#generated/prisma/enums.js";

import type { OrderTrackingStageSummary } from "../tracking/tracking.types.js";

export type CustomerParcelView = {
  shipmentId: string;
  trackingCode: string;
  status: ShipmentStatus;
  partnerName: string | null;
  partnerTrackingUrl: string | null;
  deliveredAt: string | null;
  canReportNotReceived: boolean;
  isReportedNotReceived: boolean;
};

export type CustomerTrackingEventView = {
  id: string;
  code: TrackingEventCode;
  occurredAt: string;
  brandName: string | null;
  location: string | null;
  reasonCode: DeliveryFailureReason | null;
  shipmentId: string | null;
};

export type CustomerOrderTrackingView = {
  stage: OrderTrackingStageSummary | null;
  parcels: CustomerParcelView[];
  events: CustomerTrackingEventView[];
};
