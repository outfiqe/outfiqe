import { prisma } from "#db/prisma.js";
import { buildCursorPage } from "#lib/pagination.utils.js";

import { offerErrors } from "./outfit-offer.errors.js";
import { type LoadedOffer, outfitOfferRepository } from "./outfit-offer.repository.js";
import type { OfferPage, OfferView, OfferViewerSide } from "./outfit-offer.types.js";
import { toOfferView } from "./outfit-offer.utils.js";

export const reloadView = async (offerId: string, side: OfferViewerSide): Promise<OfferView> => {
  const offer = await outfitOfferRepository.findById(prisma, offerId);
  if (!offer) throw offerErrors.notFound();
  return toOfferView(offer, side);
};

export const pageOf = (
  rows: LoadedOffer[],
  limit: number,
  sideOf: (offer: LoadedOffer) => OfferViewerSide,
): OfferPage => {
  const { items, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);
  return { items: items.map((offer) => toOfferView(offer, sideOf(offer))), nextCursor };
};
