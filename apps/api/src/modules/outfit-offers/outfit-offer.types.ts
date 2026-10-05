import type {
  OutfitOfferPayoutStatus,
  OutfitOfferRefundStatus,
  OutfitOfferStatus,
  PaymentMethod,
} from "#generated/prisma/enums.js";
import type { PaymentInitiateResult } from "#modules/payments/payment.types.js";

import type { OFFER_VIEWER_SIDE } from "./outfit-offer.constants.js";

export type OfferViewerSide = (typeof OFFER_VIEWER_SIDE)[keyof typeof OFFER_VIEWER_SIDE];

export type OfferPersonView = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
};

export type OfferView = {
  id: string;
  outfitId: string;
  outfitVersion: number;
  outfitTitle: string | null;
  brand: { id: string; name: string };
  creator: OfferPersonView;
  amount: number;
  note: string | null;
  paymentMethod: PaymentMethod;
  status: OutfitOfferStatus;
  refundStatus: OutfitOfferRefundStatus;
  payoutStatus: OutfitOfferPayoutStatus;
  acceptBy: string | null;
  postBy: string | null;
  lookId: string | null;
  postedAt: string | null;
  releaseAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
  closedReason: string | null;
  createdAt: string;
  viewerSide: OfferViewerSide;
};

export type OfferPage = { items: OfferView[]; nextCursor: string | null };

export type SentOfferResult = { offer: OfferView; payment: PaymentInitiateResult };

export type OfferPaymentCheck = { offer: OfferView; isPaid: boolean; isFailed: boolean };
