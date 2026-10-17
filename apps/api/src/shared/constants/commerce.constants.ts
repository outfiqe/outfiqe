export const ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_ID_MAX = 128;

export const ORDER_REFUND_OUTCOME = {
  ISSUED: "ISSUED",
  DETAILS_NEEDED: "DETAILS_NEEDED",
} as const;

export type OrderRefundOutcome = (typeof ORDER_REFUND_OUTCOME)[keyof typeof ORDER_REFUND_OUTCOME];
