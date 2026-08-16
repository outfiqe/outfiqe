import type { FulfilmentStatusValue, PaymentStatusValue } from "./schemas";

type BadgeTone = "neutral" | "positive" | "negative";

export const FULFILMENT_STATUS_TONE: Record<FulfilmentStatusValue, BadgeTone> = {
  PLACED: "neutral",
  PACKED: "neutral",
  SHIPPED: "neutral",
  DELIVERED: "positive",
  CANCELLED: "negative",
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatusValue, BadgeTone> = {
  INITIATED: "neutral",
  DUE: "neutral",
  PAID: "positive",
  FAILED: "negative",
  REFUNDED: "negative",
};
