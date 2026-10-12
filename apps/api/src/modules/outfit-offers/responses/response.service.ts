import { prisma } from "#db/prisma.js";
import { NotificationType, OutfitOfferStatus } from "#generated/prisma/enums.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import type { DbClient } from "#types/db.types.js";

import { OFFER_CLOSED_REASON, OFFER_VIEWER_SIDE } from "../outfit-offer.constants.js";
import { offerErrors } from "../outfit-offer.errors.js";
import { requireBrandSide, requireCreatorSide } from "../outfit-offer.guards.js";
import { queueOfferNotice } from "../outfit-offer.notifications.js";
import { outfitOfferRepository } from "../outfit-offer.repository.js";
import { closeWithRefund, refundOffer } from "../outfit-offer.settlement.js";
import type { OfferView } from "../outfit-offer.types.js";
import { deadlineAfterDays } from "../outfit-offer.utils.js";
import { reloadView } from "../outfit-offer.views.js";

export const outfitOfferResponseService = {
  async accept(userId: string, offerId: string): Promise<OfferView> {
    const offer = await requireCreatorSide(offerId, userId);
    if (offer.acceptBy && offer.acceptBy <= new Date()) {
      throw offerErrors.invalidTransition("The time to answer this offer has passed.");
    }
    const postWithinDays = await platformSettingsService.get("outfit.offerPostWithinDays");
    const acceptedAt = new Date();
    const isAccepted = await prisma.$transaction(async (tx) => {
      const isMoved = await outfitOfferRepository.moveStatus(
        tx,
        offerId,
        [OutfitOfferStatus.AWAITING_RESPONSE],
        {
          status: OutfitOfferStatus.ACCEPTED,
          acceptedAt,
          postBy: deadlineAfterDays(acceptedAt, postWithinDays),
        },
      );
      if (isMoved && offer.sentById) {
        await queueOfferNotice(tx, {
          offerId,
          type: NotificationType.OUTFIT_OFFER_ACCEPTED,
          recipientIds: [offer.sentById],
          actorId: userId,
        });
      }
      return isMoved;
    });
    if (!isAccepted) throw offerErrors.invalidTransition("This offer can't be accepted now.");
    const alreadyPostedLookId = await outfitOfferRepository.findLiveLookFromVersion(prisma, {
      creatorId: userId,
      outfitId: offer.outfitId,
      outfitVersion: offer.outfitVersion,
    });
    if (alreadyPostedLookId) {
      await outfitOfferResponseService.recordPostedLook(prisma, {
        creatorId: userId,
        outfitId: offer.outfitId,
        outfitVersion: offer.outfitVersion,
        lookId: alreadyPostedLookId,
      });
    }
    return reloadView(offerId, OFFER_VIEWER_SIDE.CREATOR);
  },

  async decline(userId: string, offerId: string): Promise<OfferView> {
    const offer = await requireCreatorSide(offerId, userId);
    const isDeclined = await prisma.$transaction(async (tx) => {
      const isMoved = await closeWithRefund(
        tx,
        offer,
        [OutfitOfferStatus.AWAITING_RESPONSE],
        OutfitOfferStatus.DECLINED,
        OFFER_CLOSED_REASON.DECLINED_BY_CREATOR,
      );
      if (isMoved && offer.sentById) {
        await queueOfferNotice(tx, {
          offerId,
          type: NotificationType.OUTFIT_OFFER_DECLINED,
          recipientIds: [offer.sentById],
          actorId: userId,
        });
      }
      return isMoved;
    });
    if (!isDeclined) throw offerErrors.invalidTransition("This offer can't be declined now.");
    await refundOffer(offerId);
    return reloadView(offerId, OFFER_VIEWER_SIDE.CREATOR);
  },

  async cancel(userId: string, offerId: string): Promise<OfferView> {
    const offer = await requireBrandSide(offerId, userId);
    const isCancelled = await closeWithRefund(
      prisma,
      offer,
      [OutfitOfferStatus.AWAITING_RESPONSE],
      OutfitOfferStatus.CANCELLED,
      OFFER_CLOSED_REASON.CANCELLED_BY_BRAND,
    );
    if (!isCancelled) {
      throw offerErrors.invalidTransition("Only offers the muse hasn't answered can be cancelled.");
    }
    await refundOffer(offerId);
    return reloadView(offerId, OFFER_VIEWER_SIDE.BRAND);
  },

  async recordPostedLook(
    client: DbClient,
    {
      creatorId,
      outfitId,
      outfitVersion,
      lookId,
    }: { creatorId: string; outfitId: string; outfitVersion: number; lookId: string },
  ): Promise<void> {
    const acceptedOffer = await outfitOfferRepository.findAcceptedForLook(client, {
      creatorId,
      outfitId,
      outfitVersion,
    });
    if (!acceptedOffer) return;
    const holdDays = await platformSettingsService.get("outfit.offerHoldDays");
    const postedAt = new Date();
    await outfitOfferRepository.moveStatus(client, acceptedOffer.id, [OutfitOfferStatus.ACCEPTED], {
      status: OutfitOfferStatus.POSTED,
      lookId,
      postedAt,
      releaseAt: deadlineAfterDays(postedAt, holdDays),
    });
  },
};
