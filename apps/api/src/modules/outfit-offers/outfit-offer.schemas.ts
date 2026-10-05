import { z } from "zod";

import {
  OutfitOfferPayoutStatus,
  OutfitOfferRefundStatus,
  OutfitOfferStatus,
} from "#generated/prisma/enums.js";

import { OFFER_NOTE_MAX_LENGTH, OFFER_PAYMENT_METHODS } from "./outfit-offer.constants.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const REASON_MAX_LENGTH = 500;
const LARGEST_STORABLE_AMOUNT = 2_147_483_647;

export const sendOfferSchema = z
  .object({
    creatorId: z.uuid(),
    amount: z.number().int().positive().max(LARGEST_STORABLE_AMOUNT),
    paymentMethod: z.enum(OFFER_PAYMENT_METHODS),
    note: z.string().trim().min(1).max(OFFER_NOTE_MAX_LENGTH).optional(),
  })
  .strict();

export const offerIdParamSchema = z.object({ offerId: z.uuid() });

export const listOffersQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const listAdminOffersQuerySchema = listOffersQuerySchema.extend({
  status: z.enum(OutfitOfferStatus).optional(),
  refundStatus: z.enum(OutfitOfferRefundStatus).optional(),
  payoutStatus: z.enum(OutfitOfferPayoutStatus).optional(),
});

export const adminOfferActionSchema = z
  .object({ reason: z.string().trim().min(1).max(REASON_MAX_LENGTH) })
  .strict();

export type SendOfferBody = z.infer<typeof sendOfferSchema>;
export type OfferIdParam = z.infer<typeof offerIdParamSchema>;
export type ListOffersQuery = z.infer<typeof listOffersQuerySchema>;
export type ListAdminOffersQuery = z.infer<typeof listAdminOffersQuerySchema>;
export type AdminOfferActionBody = z.infer<typeof adminOfferActionSchema>;
