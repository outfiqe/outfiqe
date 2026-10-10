import { prisma } from "#db/prisma.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";

import { OFFER_VIEWER_SIDE } from "./outfit-offer.constants.js";
import { offerErrors } from "./outfit-offer.errors.js";
import { type LoadedOffer, outfitOfferRepository } from "./outfit-offer.repository.js";
import type { OfferViewerSide } from "./outfit-offer.types.js";

const sideFor = (
  offer: LoadedOffer,
  userId: string,
  brandId: string | null,
): OfferViewerSide | null => {
  if (offer.creatorId === userId) return OFFER_VIEWER_SIDE.CREATOR;
  if (brandId !== null && offer.brandId === brandId) return OFFER_VIEWER_SIDE.BRAND;
  return null;
};

export const findViewerBrandId = async (userId: string): Promise<string | null> => {
  try {
    return await requireBrandId(userId);
  } catch {
    return null;
  }
};

export const requireOfferForViewer = async (
  offerId: string,
  userId: string,
): Promise<{ offer: LoadedOffer; side: OfferViewerSide }> => {
  const [offer, brandId] = await Promise.all([
    outfitOfferRepository.findById(prisma, offerId),
    findViewerBrandId(userId),
  ]);
  const side = offer ? sideFor(offer, userId, brandId) : null;
  if (!offer || !side) throw offerErrors.notFound();
  return { offer, side };
};

export const requireBrandSide = async (offerId: string, userId: string): Promise<LoadedOffer> => {
  const { offer, side } = await requireOfferForViewer(offerId, userId);
  if (side !== OFFER_VIEWER_SIDE.BRAND) throw offerErrors.notFound();
  return offer;
};

export const requireCreatorSide = async (offerId: string, userId: string): Promise<LoadedOffer> => {
  const { offer, side } = await requireOfferForViewer(offerId, userId);
  if (side !== OFFER_VIEWER_SIDE.CREATOR) throw offerErrors.notFound();
  return offer;
};
