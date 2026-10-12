import { prisma } from "#db/prisma.js";
import { OutfitOfferRefundStatus, OutfitOfferStatus } from "#generated/prisma/enums.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import {
  OFFER_AUDIT_TARGET_TYPE,
  OFFER_CLOSED_REASON,
  OFFER_VIEWER_SIDE,
} from "../outfit-offer.constants.js";
import { offerErrors } from "../outfit-offer.errors.js";
import { outfitOfferRepository } from "../outfit-offer.repository.js";
import type { AdminOfferActionBody, ListAdminOffersQuery } from "../outfit-offer.schemas.js";
import { closeWithRefund, refundOffer, releaseToCreator } from "../outfit-offer.settlement.js";
import type { OfferPage, OfferView } from "../outfit-offer.types.js";
import { pageOf, reloadView } from "../outfit-offer.views.js";

const PAID_OPEN_STATUSES: OutfitOfferStatus[] = [
  OutfitOfferStatus.AWAITING_RESPONSE,
  OutfitOfferStatus.ACCEPTED,
  OutfitOfferStatus.POSTED,
];

export const outfitOfferAdminService = {
  async listForAdmin(query: ListAdminOffersQuery): Promise<OfferPage> {
    const { status, refundStatus, payoutStatus, cursor, limit } = query;
    const rows = await outfitOfferRepository.listForAdmin(
      { status, refundStatus, payoutStatus },
      { cursor, limit },
    );
    return pageOf(rows, limit, () => OFFER_VIEWER_SIDE.ADMIN);
  },

  async adminRelease(
    adminUserId: string,
    offerId: string,
    { reason }: AdminOfferActionBody,
  ): Promise<OfferView> {
    const offer = await outfitOfferRepository.findById(prisma, offerId);
    if (!offer) throw offerErrors.notFound();
    const isReleased = await releaseToCreator(offer, [
      OutfitOfferStatus.ACCEPTED,
      OutfitOfferStatus.POSTED,
    ]);
    if (!isReleased) {
      throw offerErrors.invalidTransition("Only accepted or dropped offers can be released.");
    }
    await platformAudit.record({
      actorUserId: adminUserId,
      action: PLATFORM_AUDIT_ACTION.OUTFIT_OFFER_RELEASED_BY_ADMIN,
      summary: `Released Rs. ${offer.amount} from ${offer.brand.name} to the muse: ${reason}`,
      onBehalfOfUserId: offer.creatorId,
      targetType: OFFER_AUDIT_TARGET_TYPE,
      targetId: offerId,
      metadata: { reason, fromStatus: offer.status, amount: offer.amount },
    });
    return reloadView(offerId, OFFER_VIEWER_SIDE.ADMIN);
  },

  async adminRefund(
    adminUserId: string,
    offerId: string,
    { reason }: AdminOfferActionBody,
  ): Promise<OfferView> {
    const offer = await outfitOfferRepository.findById(prisma, offerId);
    if (!offer) throw offerErrors.notFound();
    const isClosed = await closeWithRefund(
      prisma,
      offer,
      PAID_OPEN_STATUSES,
      OutfitOfferStatus.CANCELLED,
      OFFER_CLOSED_REASON.REFUNDED_BY_ADMIN,
    );
    if (!isClosed) {
      throw offerErrors.invalidTransition("Only paid offers that are still open can be refunded.");
    }
    await platformAudit.record({
      actorUserId: adminUserId,
      action: PLATFORM_AUDIT_ACTION.OUTFIT_OFFER_REFUNDED_BY_ADMIN,
      summary: `Refunded Rs. ${offer.amount} to ${offer.brand.name}: ${reason}`,
      targetType: OFFER_AUDIT_TARGET_TYPE,
      targetId: offerId,
      metadata: { reason, fromStatus: offer.status, amount: offer.amount },
    });
    await refundOffer(offerId);
    return reloadView(offerId, OFFER_VIEWER_SIDE.ADMIN);
  },

  async adminMarkRefunded(
    adminUserId: string,
    offerId: string,
    { reason }: AdminOfferActionBody,
  ): Promise<OfferView> {
    const offer = await outfitOfferRepository.findById(prisma, offerId);
    if (!offer) throw offerErrors.notFound();
    const isMarked = await outfitOfferRepository.setRefundStatus(
      prisma,
      offerId,
      [OutfitOfferRefundStatus.NEEDS_MANUAL_REFUND],
      { refundStatus: OutfitOfferRefundStatus.REFUNDED, refundedAt: new Date() },
    );
    if (!isMarked) {
      throw offerErrors.invalidTransition("This offer isn't waiting for a manual refund.");
    }
    await platformAudit.record({
      actorUserId: adminUserId,
      action: PLATFORM_AUDIT_ACTION.OUTFIT_OFFER_MARKED_REFUNDED,
      summary: `Marked Rs. ${offer.amount} as refunded to ${offer.brand.name}: ${reason}`,
      targetType: OFFER_AUDIT_TARGET_TYPE,
      targetId: offerId,
      metadata: { reason, amount: offer.amount },
    });
    return reloadView(offerId, OFFER_VIEWER_SIDE.ADMIN);
  },
};
