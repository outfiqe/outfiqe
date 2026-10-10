import { z } from "zod";

export const OFFER_STATUS_VALUES = [
  "PAYMENT_PENDING",
  "PAYMENT_FAILED",
  "AWAITING_RESPONSE",
  "ACCEPTED",
  "POSTED",
  "RELEASED",
  "DECLINED",
  "CANCELLED",
  "EXPIRED",
  "LOOK_REMOVED",
] as const;

export const OFFER_REFUND_STATUS_VALUES = [
  "NOT_NEEDED",
  "PENDING",
  "REFUNDED",
  "NEEDS_MANUAL_REFUND",
] as const;

export const adminOfferSchema = z.object({
  id: z.string(),
  outfitId: z.string(),
  outfitTitle: z.string().nullable(),
  brand: z.object({ id: z.string(), name: z.string() }),
  creator: z.object({ id: z.string(), name: z.string(), handle: z.string() }),
  amount: z.number(),
  paymentMethod: z.enum(["ESEWA", "KHALTI"]),
  status: z.enum(OFFER_STATUS_VALUES),
  refundStatus: z.enum(OFFER_REFUND_STATUS_VALUES),
  payoutStatus: z.enum(["NONE", "AVAILABLE", "PAID"]),
  postBy: z.string().nullable(),
  releaseAt: z.string().nullable(),
  createdAt: z.string(),
});

export const adminOfferPageSchema = z.object({
  items: z.array(adminOfferSchema),
  nextCursor: z.string().nullable(),
});

export type AdminOffer = z.infer<typeof adminOfferSchema>;
export type AdminOfferPage = z.infer<typeof adminOfferPageSchema>;
export type OfferStatusValue = AdminOffer["status"];
export type OfferRefundStatusValue = AdminOffer["refundStatus"];
