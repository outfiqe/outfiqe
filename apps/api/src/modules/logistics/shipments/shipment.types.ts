import type {
  DeliveryFailureReason,
  ItemInspectionStatus,
  PaymentMethod,
  PickupStatus,
  ShipmentStatus,
  TrackingEventCode,
  TrackingEventSource,
} from "#generated/prisma/enums.js";

import type { ParcelBookingSummary } from "../hub-operations/hub-operation.types.js";

export type ShipmentSummaryView = {
  shipmentId: string;
  orderId: string;
  trackingCode: string;
  displayTrackingCode: string;
  status: ShipmentStatus;
  codAmountToCollect: number;
  isLabelUpToDate: boolean;
  recipientName: string;
  city: string;
  packedAt: string;
  lastEventAt: string;
  booking: ParcelBookingSummary | null;
};

export type ShipmentEventView = {
  id: string;
  code: TrackingEventCode;
  source: TrackingEventSource;
  rawStatus: string | null;
  reasonCode: DeliveryFailureReason | null;
  note: string | null;
  occurredAt: string;
  appliedToStatus: boolean;
  partnerName: string | null;
  actorName: string | null;
};

export type ShipmentDetailView = ShipmentSummaryView & {
  hubId: string;
  currency: string;
  weightGrams: number;
  parcelCount: number;
  deliveryAttemptCount: number;
  deliveredAt: string | null;
  labelPrintedAt: string | null;
  pickups: {
    fulfilmentGroupId: string;
    brandName: string;
    items: { orderItemId: string; productName: string; sizeLabel: string; units: number }[];
  }[];
  events: ShipmentEventView[];
};

export type OrderToPackView = {
  orderId: string;
  placedAt: string;
  customerName: string;
  city: string;
  paymentMethod: PaymentMethod;
  pickupsStillComing: number;
  pickupsAtHub: {
    fulfilmentGroupId: string;
    brandName: string;
    isInspected: boolean;
    items: {
      orderItemId: string;
      productName: string;
      sizeLabel: string;
      units: number;
      inspectionStatus: ItemInspectionStatus;
      failedQty: number;
    }[];
  }[];
  otherPickups: {
    fulfilmentGroupId: string;
    brandName: string;
    pickupStatus: PickupStatus | null;
  }[];
};
