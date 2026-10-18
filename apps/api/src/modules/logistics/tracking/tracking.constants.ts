import { OrderTrackingStage as SharedOrderTrackingStage } from "@outfiqe/utils";

export const ORDER_TRACKING_STAGE = SharedOrderTrackingStage;

export type OrderTrackingStage = SharedOrderTrackingStage;

export const TRACKING_SUBJECT_KIND = {
  PICKUP: "PICKUP",
  SHIPMENT: "SHIPMENT",
} as const;
