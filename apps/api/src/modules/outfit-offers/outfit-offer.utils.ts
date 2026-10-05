import { addDays } from "date-fns/addDays";
import { z } from "zod";

import type { Prisma } from "#generated/prisma/client.js";
import type {
  OutfitOfferPayoutStatus,
  OutfitOfferRefundStatus,
  OutfitOfferStatus,
  PaymentMethod,
} from "#generated/prisma/enums.js";

import type { OfferView, OfferViewerSide } from "./outfit-offer.types.js";

export type OfferRow = {
  id: string;
  outfitId: string;
  outfitVersion: number;
  amount: number;
  note: string | null;
  paymentMethod: PaymentMethod;
  status: OutfitOfferStatus;
  refundStatus: OutfitOfferRefundStatus;
  payoutStatus: OutfitOfferPayoutStatus;
  acceptBy: Date | null;
  postBy: Date | null;
  lookId: string | null;
  postedAt: Date | null;
  releaseAt: Date | null;
  releasedAt: Date | null;
  refundedAt: Date | null;
  closedReason: string | null;
  createdAt: Date;
  outfit: { title: string | null };
  brand: { id: string; name: string };
  creator: { id: string; name: string; handle: string; avatarUrl: string | null };
};

const toIsoOrNull = (date: Date | null): string | null => date?.toISOString() ?? null;

export const toOfferView = (row: OfferRow, viewerSide: OfferViewerSide): OfferView => ({
  id: row.id,
  outfitId: row.outfitId,
  outfitVersion: row.outfitVersion,
  outfitTitle: row.outfit.title,
  brand: row.brand,
  creator: row.creator,
  amount: row.amount,
  note: row.note,
  paymentMethod: row.paymentMethod,
  status: row.status,
  refundStatus: row.refundStatus,
  payoutStatus: row.payoutStatus,
  acceptBy: toIsoOrNull(row.acceptBy),
  postBy: toIsoOrNull(row.postBy),
  lookId: row.lookId,
  postedAt: toIsoOrNull(row.postedAt),
  releaseAt: toIsoOrNull(row.releaseAt),
  releasedAt: toIsoOrNull(row.releasedAt),
  refundedAt: toIsoOrNull(row.refundedAt),
  closedReason: row.closedReason,
  createdAt: row.createdAt.toISOString(),
  viewerSide,
});

const storedJsonSchema = z.json();

export const toStoredJson = (value: unknown): Prisma.InputJsonValue => {
  const parsed = storedJsonSchema.safeParse(value);
  if (!parsed.success || parsed.data === null) return { unreadableResponse: true };
  return parsed.data;
};

export const deadlineAfterDays = (from: Date, days: number): Date => addDays(from, days);

export const isAmountInRange = (amount: number, minimum: number, maximum: number): boolean =>
  amount >= minimum && amount <= maximum;
