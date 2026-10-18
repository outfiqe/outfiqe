export const OrderTrackingStage = {
  ORDER_PLACED: "ORDER_PLACED",
  COLLECTING_ITEMS: "COLLECTING_ITEMS",
  AT_HUB: "AT_HUB",
  PACKED: "PACKED",
  ON_ITS_WAY: "ON_ITS_WAY",
  DELIVERY_ATTEMPT_FAILED: "DELIVERY_ATTEMPT_FAILED",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  RETURNING: "RETURNING",
  CANCELLED: "CANCELLED",
} as const;
export type OrderTrackingStage = (typeof OrderTrackingStage)[keyof typeof OrderTrackingStage];

export const ORDER_TRACKING_STAGE_MESSAGES: Readonly<Record<OrderTrackingStage, string>> = {
  [OrderTrackingStage.ORDER_PLACED]: "Your order is placed",
  [OrderTrackingStage.COLLECTING_ITEMS]: "We're collecting your items from the brand",
  [OrderTrackingStage.AT_HUB]: "Your items reached our hub",
  [OrderTrackingStage.PACKED]: "Your order is packed",
  [OrderTrackingStage.ON_ITS_WAY]: "Your order is on its way",
  [OrderTrackingStage.DELIVERY_ATTEMPT_FAILED]: "We couldn't deliver your order. We'll try again",
  [OrderTrackingStage.OUT_FOR_DELIVERY]: "Your order is out for delivery",
  [OrderTrackingStage.DELIVERED]: "Your order was delivered",
  [OrderTrackingStage.RETURNING]: "Your order is coming back to us",
  [OrderTrackingStage.CANCELLED]: "Your order was cancelled",
};

const ORDER_TRACKING_STAGES: readonly string[] = Object.values(OrderTrackingStage);

export const isOrderTrackingStage = (value: unknown): value is OrderTrackingStage =>
  typeof value === "string" && ORDER_TRACKING_STAGES.includes(value);
