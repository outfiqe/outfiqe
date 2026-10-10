import { prisma } from "#db/prisma.js";
import { OutfitOfferStatus } from "#generated/prisma/enums.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { outfitErrors } from "#modules/outfits/outfit.errors.js";
import { outfitRepository } from "#modules/outfits/outfit.repository.js";

import { outfitOfferAdminService } from "./admin/admin.service.js";
import { OFFER_VIEWER_SIDE } from "./outfit-offer.constants.js";
import { offerErrors } from "./outfit-offer.errors.js";
import { findViewerBrandId, requireOfferForViewer } from "./outfit-offer.guards.js";
import { outfitOfferRepository } from "./outfit-offer.repository.js";
import type { ListOffersQuery } from "./outfit-offer.schemas.js";
import type { OfferPage, OfferView } from "./outfit-offer.types.js";
import { toOfferView } from "./outfit-offer.utils.js";
import { pageOf } from "./outfit-offer.views.js";
import { outfitOfferResponseService } from "./responses/response.service.js";
import { outfitOfferSendingService } from "./sending/sending.service.js";

export const outfitOfferService = {
  async get(userId: string, offerId: string): Promise<OfferView> {
    const { offer, side } = await requireOfferForViewer(offerId, userId);
    const isHiddenFromCreator =
      side === OFFER_VIEWER_SIDE.CREATOR &&
      (offer.status === OutfitOfferStatus.PAYMENT_PENDING ||
        offer.status === OutfitOfferStatus.PAYMENT_FAILED);
    if (isHiddenFromCreator) throw offerErrors.notFound();
    return toOfferView(offer, side);
  },

  async listSent(userId: string, page: ListOffersQuery): Promise<OfferPage> {
    const brandId = await requireBrandId(userId);
    const rows = await outfitOfferRepository.listForBrand(brandId, page);
    return pageOf(rows, page.limit, () => OFFER_VIEWER_SIDE.BRAND);
  },

  async listReceived(userId: string, page: ListOffersQuery): Promise<OfferPage> {
    const rows = await outfitOfferRepository.listForCreator(userId, page);
    return pageOf(rows, page.limit, () => OFFER_VIEWER_SIDE.CREATOR);
  },

  async listForBuild(userId: string, outfitId: string): Promise<OfferView[]> {
    const memberRole = await outfitRepository.findMemberRole(prisma, outfitId, userId);
    if (!memberRole) throw outfitErrors.notFound();
    const brandId = await findViewerBrandId(userId);
    const rows = await outfitOfferRepository.listForOutfit(outfitId, {
      brandId: brandId ?? undefined,
      creatorId: userId,
    });
    return rows.map((offer) =>
      toOfferView(
        offer,
        offer.creatorId === userId ? OFFER_VIEWER_SIDE.CREATOR : OFFER_VIEWER_SIDE.BRAND,
      ),
    );
  },

  ...outfitOfferSendingService,

  ...outfitOfferResponseService,

  ...outfitOfferAdminService,
};
