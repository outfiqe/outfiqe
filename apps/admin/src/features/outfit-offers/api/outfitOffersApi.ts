import { apiClient } from "@/lib/apiClient";

import {
  type AdminOffer,
  type AdminOfferPage,
  adminOfferPageSchema,
  adminOfferSchema,
  type OfferRefundStatusValue,
  type OfferStatusValue,
} from "./outfitOffersSchemas";

export type OfferFilter =
  | { kind: "status"; status: OfferStatusValue }
  | { kind: "refund"; refundStatus: OfferRefundStatusValue };

export type AdminOfferAction = "release" | "refund" | "mark-refunded";

export const offersApi = {
  async list(filter: OfferFilter, cursor?: string): Promise<AdminOfferPage> {
    const params = new URLSearchParams();
    if (filter.kind === "status") params.set("status", filter.status);
    else params.set("refundStatus", filter.refundStatus);
    if (cursor) params.set("cursor", cursor);
    const res = await apiClient.get<AdminOfferPage>(`/outfit-offers/admin?${params}`);
    return adminOfferPageSchema.parse(res.data);
  },

  async act(offerId: string, action: AdminOfferAction, reason: string): Promise<AdminOffer> {
    const res = await apiClient.post<AdminOffer>(`/outfit-offers/admin/${offerId}/${action}`, {
      reason,
    });
    return adminOfferSchema.parse(res.data);
  },
};
