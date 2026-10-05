import { IDEMPOTENCY_HEADER } from "@outfiqe/client";
import { z } from "zod";

import { apiClient } from "@/shared/lib/apiClient";

import {
  type Offer,
  type OfferPage,
  offerPageSchema,
  type OfferPaymentCheck,
  offerPaymentCheckSchema,
  type OfferPaymentMethod,
  offerSchema,
  type SentOffer,
  sentOfferSchema,
} from "./offerSchemas";

export type SendOfferInput = {
  creatorId: string;
  amount: number;
  paymentMethod: OfferPaymentMethod;
  note?: string;
};

const offerListSchema = z.array(offerSchema);

export const offerApi = {
  async send(outfitId: string, input: SendOfferInput, idempotencyKey: string): Promise<SentOffer> {
    const res = await apiClient.post(`/outfit-offers/builds/${outfitId}`, input, {
      headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
    });
    return sentOfferSchema.parse(res.data);
  },

  async listForBuild(outfitId: string): Promise<Offer[]> {
    const res = await apiClient.get(`/outfit-offers/builds/${outfitId}`);
    return offerListSchema.parse(res.data);
  },

  async listReceived(cursor?: string): Promise<OfferPage> {
    const res = await apiClient.get("/outfit-offers/received", { params: { cursor } });
    return offerPageSchema.parse(res.data);
  },

  async listSent(cursor?: string): Promise<OfferPage> {
    const res = await apiClient.get("/outfit-offers/sent", { params: { cursor } });
    return offerPageSchema.parse(res.data);
  },

  async retryPayment(offerId: string): Promise<SentOffer> {
    const res = await apiClient.post(`/outfit-offers/${offerId}/payment`);
    return sentOfferSchema.parse(res.data);
  },

  async verifyPayment(offerId: string): Promise<OfferPaymentCheck> {
    const res = await apiClient.post(`/outfit-offers/${offerId}/payment/verify`);
    return offerPaymentCheckSchema.parse(res.data);
  },

  async respond(offerId: string, action: "accept" | "decline" | "cancel"): Promise<Offer> {
    const res = await apiClient.post(`/outfit-offers/${offerId}/${action}`);
    return offerSchema.parse(res.data);
  },
};
