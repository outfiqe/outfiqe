import { HttpResponse } from "msw";

import type { Offer } from "../api/offerSchemas";

export const ok = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

export const buildOffer = (overrides: Partial<Offer> = {}): Offer => ({
  id: "offer-1",
  outfitId: "outfit-1",
  outfitVersion: 1,
  outfitTitle: "Dashain set",
  brand: { id: "brand-1", name: "Kastha" },
  creator: { id: "creator-1", name: "Ram", handle: "ram", avatarUrl: null },
  amount: 5000,
  note: null,
  paymentMethod: "KHALTI",
  status: "AWAITING_RESPONSE",
  refundStatus: "NOT_NEEDED",
  payoutStatus: "NONE",
  acceptBy: "2026-10-06T10:00:00.000Z",
  postBy: null,
  lookId: null,
  postedAt: null,
  releaseAt: null,
  releasedAt: null,
  refundedAt: null,
  closedReason: null,
  createdAt: "2026-10-03T10:00:00.000Z",
  viewerSide: "BRAND",
  ...overrides,
});
