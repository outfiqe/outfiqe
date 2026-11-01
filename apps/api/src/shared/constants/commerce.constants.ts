import { millisecondsInDay } from "date-fns/constants";
export const ATTRIBUTION_WINDOW_MS = 7 * millisecondsInDay;
export const SESSION_ID_MAX = 128;

export const ORDER_REFUND_OUTCOME = {
  ISSUED: "ISSUED",
  DETAILS_NEEDED: "DETAILS_NEEDED",
} as const;

export type OrderRefundOutcome = (typeof ORDER_REFUND_OUTCOME)[keyof typeof ORDER_REFUND_OUTCOME];
