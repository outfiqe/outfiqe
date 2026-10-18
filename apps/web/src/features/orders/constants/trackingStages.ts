import { OrderTrackingStage } from "@outfiqe/utils";

export const FORWARD_TRACKING_STAGES: readonly OrderTrackingStage[] = [
  OrderTrackingStage.ORDER_PLACED,
  OrderTrackingStage.COLLECTING_ITEMS,
  OrderTrackingStage.AT_HUB,
  OrderTrackingStage.PACKED,
  OrderTrackingStage.ON_ITS_WAY,
  OrderTrackingStage.OUT_FOR_DELIVERY,
  OrderTrackingStage.DELIVERED,
];

export const STAGE_SHOWN_AS: Partial<Record<OrderTrackingStage, OrderTrackingStage>> = {
  [OrderTrackingStage.DELIVERY_ATTEMPT_FAILED]: OrderTrackingStage.ON_ITS_WAY,
};

export const DELIVERY_FAILED_EVENT_CODE = "DELIVERY_FAILED";
export const MIN_REPORT_DETAILS_LENGTH = 10;
export const MAX_REPORT_DETAILS_LENGTH = 1000;
