import { subMilliseconds } from "date-fns/subMilliseconds";

import { prisma } from "#db/prisma.js";
import { NotificationType, OutfitOfferStatus } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { featureFlagsService } from "#modules/feature-flags/feature-flags.service.js";
import { describeError } from "#redis/redis.utils.js";

import {
  OFFER_CLOSED_REASON,
  OFFER_PAYMENT_CHECK_AFTER_MS,
  OFFER_PAYMENT_EXPIRE_AFTER_MS,
} from "./outfit-offer.constants.js";
import { queueOfferNotice } from "./outfit-offer.notifications.js";
import { outfitOfferRepository } from "./outfit-offer.repository.js";
import {
  closeWithRefund,
  refundOffer,
  releaseToCreator,
  verifyPendingPayment,
} from "./outfit-offer.service.js";

export type OfferLifecycleSweepResult = {
  paymentsChecked: number;
  paymentsExpired: number;
  expired: number;
  released: number;
  lookRemoved: number;
  refundsRetried: number;
};

const NO_OFFERS = 0;
const ONE_OFFER = 1;

const runEach = async (offerIds: string[], step: (offerId: string) => Promise<boolean>) => {
  let changed = NO_OFFERS;
  for (const offerId of offerIds) {
    try {
      if (await step(offerId)) changed += ONE_OFFER;
    } catch (error) {
      logger.error(`Offer sweep step failed for ${offerId}: ${describeError(error)}`);
    }
  }
  return changed;
};

const loadOffer = (offerId: string) => outfitOfferRepository.findById(prisma, offerId);

const checkUnpaidOffer = async (offerId: string): Promise<boolean> => {
  const offer = await loadOffer(offerId);
  if (!offer || offer.status !== OutfitOfferStatus.PAYMENT_PENDING) return false;
  await verifyPendingPayment(offer);
  return true;
};

const expireUnpaidOffer = async (offerId: string): Promise<boolean> => {
  const offer = await loadOffer(offerId);
  if (!offer || offer.status !== OutfitOfferStatus.PAYMENT_PENDING) return false;
  await verifyPendingPayment(offer);
  return outfitOfferRepository.moveStatus(prisma, offerId, [OutfitOfferStatus.PAYMENT_PENDING], {
    status: OutfitOfferStatus.PAYMENT_FAILED,
    closedReason: OFFER_CLOSED_REASON.PAYMENT_NOT_COMPLETED,
    closedAt: new Date(),
  });
};

const expireMissedDeadline =
  (fromStatus: OutfitOfferStatus, closedReason: string) =>
  async (offerId: string): Promise<boolean> => {
    const offer = await loadOffer(offerId);
    if (!offer) return false;
    const isExpired = await prisma.$transaction(async (tx) => {
      const isMoved = await closeWithRefund(
        tx,
        offer,
        [fromStatus],
        OutfitOfferStatus.EXPIRED,
        closedReason,
      );
      if (isMoved) {
        await queueOfferNotice(tx, {
          offerId,
          type: NotificationType.OUTFIT_OFFER_EXPIRED,
          recipientIds: [offer.creatorId, ...(offer.sentById ? [offer.sentById] : [])],
          actorId: null,
        });
      }
      return isMoved;
    });
    if (isExpired) await refundOffer(offerId);
    return isExpired;
  };

const closeForRemovedLook = async (offerId: string): Promise<boolean> => {
  const offer = await loadOffer(offerId);
  if (!offer) return false;
  const isClosed = await closeWithRefund(
    prisma,
    offer,
    [OutfitOfferStatus.POSTED],
    OutfitOfferStatus.LOOK_REMOVED,
    OFFER_CLOSED_REASON.LOOK_REMOVED_EARLY,
  );
  if (isClosed) await refundOffer(offerId);
  return isClosed;
};

const releaseIfLookStillUp = async (offerId: string): Promise<boolean> => {
  const offer = await loadOffer(offerId);
  if (!offer || offer.status !== OutfitOfferStatus.POSTED) return false;
  const isLookLive = await outfitOfferRepository.isLookLive(prisma, offer.lookId);
  if (!isLookLive) return closeForRemovedLook(offerId);
  return releaseToCreator(offer, [OutfitOfferStatus.POSTED]);
};

const retryRefund = async (offerId: string): Promise<boolean> => {
  await refundOffer(offerId);
  return true;
};

export const runOutfitOfferLifecycleSweep = async (): Promise<OfferLifecycleSweepResult> => {
  const emptyResult: OfferLifecycleSweepResult = {
    paymentsChecked: NO_OFFERS,
    paymentsExpired: NO_OFFERS,
    expired: NO_OFFERS,
    released: NO_OFFERS,
    lookRemoved: NO_OFFERS,
    refundsRetried: NO_OFFERS,
  };
  if (!(await featureFlagsService.isRolledOutToAnyone("outfit_builder"))) return emptyResult;

  const now = new Date();
  const checkBefore = subMilliseconds(now, OFFER_PAYMENT_CHECK_AFTER_MS);
  const expireBefore = subMilliseconds(now, OFFER_PAYMENT_EXPIRE_AFTER_MS);

  const paymentsExpired = await runEach(
    await outfitOfferRepository.listUnpaidIdsCreatedBefore(expireBefore),
    expireUnpaidOffer,
  );
  const paymentsChecked = await runEach(
    await outfitOfferRepository.listUnpaidIdsCreatedBefore(checkBefore),
    checkUnpaidOffer,
  );
  const unanswered = await runEach(
    await outfitOfferRepository.listIdsByStatusBefore(
      OutfitOfferStatus.AWAITING_RESPONSE,
      "acceptBy",
      now,
    ),
    expireMissedDeadline(
      OutfitOfferStatus.AWAITING_RESPONSE,
      OFFER_CLOSED_REASON.NOT_ANSWERED_IN_TIME,
    ),
  );
  const notPosted = await runEach(
    await outfitOfferRepository.listIdsByStatusBefore(OutfitOfferStatus.ACCEPTED, "postBy", now),
    expireMissedDeadline(OutfitOfferStatus.ACCEPTED, OFFER_CLOSED_REASON.NOT_POSTED_IN_TIME),
  );
  const lookRemoved = await runEach(
    await outfitOfferRepository.listPostedIdsWithRemovedLook(),
    closeForRemovedLook,
  );
  const released = await runEach(
    await outfitOfferRepository.listIdsByStatusBefore(OutfitOfferStatus.POSTED, "releaseAt", now),
    releaseIfLookStillUp,
  );
  const refundsRetried = await runEach(
    await outfitOfferRepository.listIdsAwaitingRefund(checkBefore),
    retryRefund,
  );

  return {
    paymentsChecked,
    paymentsExpired,
    expired: unanswered + notPosted,
    released,
    lookRemoved,
    refundsRetried,
  };
};
