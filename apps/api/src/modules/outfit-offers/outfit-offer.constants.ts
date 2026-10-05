import { minutesToMilliseconds } from "date-fns/minutesToMilliseconds";

import { PaymentMethod } from "#generated/prisma/enums.js";

export const OFFER_PAYMENT_METHODS = [PaymentMethod.ESEWA, PaymentMethod.KHALTI] as const;

export const OFFER_CLOSED_REASON = {
  DECLINED_BY_CREATOR: "The creator declined the offer.",
  CANCELLED_BY_BRAND: "The brand cancelled the offer before the creator answered.",
  NOT_ANSWERED_IN_TIME: "The creator didn't answer before the deadline.",
  NOT_POSTED_IN_TIME: "The creator didn't post the look before the deadline.",
  LOOK_REMOVED_EARLY: "The look was deleted before the holding period ended.",
  PAYMENT_NOT_COMPLETED: "The payment wasn't completed.",
  REFUNDED_BY_ADMIN: "Refunded by an admin.",
  RELEASED_BY_ADMIN: "Released to the creator by an admin.",
} as const;

export const OFFER_RATE_LIMITS = {
  SEND: { windowMs: minutesToMilliseconds(60), max: 20 },
  RESPOND: { windowMs: minutesToMilliseconds(1), max: 20 },
} as const;

export const OFFER_PAYMENT_CHECK_AFTER_MS = minutesToMilliseconds(5);
export const OFFER_PAYMENT_EXPIRE_AFTER_MS = minutesToMilliseconds(60);
export const OFFER_LIFECYCLE_INTERVAL_MS = minutesToMilliseconds(15);

export const OFFER_VIEWER_SIDE = {
  BRAND: "BRAND",
  CREATOR: "CREATOR",
  ADMIN: "ADMIN",
} as const;

export const OFFER_REFUND_RESULT = {
  REFUNDED: "REFUNDED",
  NEEDS_MANUAL_REFUND: "NEEDS_MANUAL_REFUND",
} as const;

export const OFFER_NOTE_MAX_LENGTH = 300;
export const OFFER_AUDIT_TARGET_TYPE = "OutfitOffer";
