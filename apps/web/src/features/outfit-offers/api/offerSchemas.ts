import { z } from "zod";

import { paymentInitiateResultSchema } from "@/features/payments/api/paymentsSchemas";

export const OFFER_STATUS = {
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  AWAITING_RESPONSE: "AWAITING_RESPONSE",
  ACCEPTED: "ACCEPTED",
  POSTED: "POSTED",
  RELEASED: "RELEASED",
  DECLINED: "DECLINED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
  LOOK_REMOVED: "LOOK_REMOVED",
} as const;

export const OFFER_REFUND_STATUS = {
  NOT_NEEDED: "NOT_NEEDED",
  PENDING: "PENDING",
  REFUNDED: "REFUNDED",
  NEEDS_MANUAL_REFUND: "NEEDS_MANUAL_REFUND",
} as const;

export const OFFER_VIEWER_SIDE = {
  BRAND: "BRAND",
  CREATOR: "CREATOR",
  ADMIN: "ADMIN",
} as const;

export const OFFER_PAYMENT_METHODS = ["ESEWA", "KHALTI"] as const;

const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  avatarUrl: z.string().nullable(),
});

export const offerSchema = z.object({
  id: z.string(),
  outfitId: z.string(),
  outfitVersion: z.number(),
  outfitTitle: z.string().nullable(),
  brand: z.object({ id: z.string(), name: z.string() }),
  creator: personSchema,
  amount: z.number(),
  note: z.string().nullable(),
  paymentMethod: z.enum(OFFER_PAYMENT_METHODS),
  status: z.enum(OFFER_STATUS),
  refundStatus: z.enum(OFFER_REFUND_STATUS),
  payoutStatus: z.enum(["NONE", "AVAILABLE", "PAID"]),
  acceptBy: z.string().nullable(),
  postBy: z.string().nullable(),
  lookId: z.string().nullable(),
  postedAt: z.string().nullable(),
  releaseAt: z.string().nullable(),
  releasedAt: z.string().nullable(),
  refundedAt: z.string().nullable(),
  closedReason: z.string().nullable(),
  createdAt: z.string(),
  viewerSide: z.enum(OFFER_VIEWER_SIDE),
});

export const offerPageSchema = z.object({
  items: z.array(offerSchema),
  nextCursor: z.string().nullable(),
});

export const sentOfferSchema = z.object({
  offer: offerSchema,
  payment: paymentInitiateResultSchema,
});

export const offerPaymentCheckSchema = z.object({
  offer: offerSchema,
  isPaid: z.boolean(),
  isFailed: z.boolean(),
});

export type Offer = z.infer<typeof offerSchema>;
export type OfferStatus = Offer["status"];
export type OfferPage = z.infer<typeof offerPageSchema>;
export type SentOffer = z.infer<typeof sentOfferSchema>;
export type OfferPaymentCheck = z.infer<typeof offerPaymentCheckSchema>;
export type OfferPaymentMethod = (typeof OFFER_PAYMENT_METHODS)[number];
