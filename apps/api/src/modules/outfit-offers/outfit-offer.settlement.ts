import { env } from "#config/env.config.js";
import { prisma } from "#db/prisma.js";
import {
  NotificationType,
  OutfitOfferPayoutStatus,
  OutfitOfferRefundStatus,
  OutfitOfferStatus,
  PaymentTransactionStatus,
} from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";
import type { DbClient } from "#types/db.types.js";

import { OFFER_REFUND_RESULT } from "./outfit-offer.constants.js";
import { queueOfferNotice } from "./outfit-offer.notifications.js";
import { refundOfferPayment } from "./outfit-offer.payments.js";
import { type LoadedOffer, outfitOfferRepository } from "./outfit-offer.repository.js";
import { toStoredJson } from "./outfit-offer.utils.js";

const alertOpsOfManualOfferRefund = (offer: LoadedOffer): void => {
  void sendEmail({
    to: env.OPS_NOTIFICATION_EMAIL,
    subject: `Offer ${offer.id} needs a manual refund`,
    body: `Refund Rs. ${offer.amount} to ${offer.brand.name} for offer ${offer.id} (${offer.paymentMethod}). Then mark it refunded in admin.`,
  });
};

export const refundOffer = async (offerId: string): Promise<void> => {
  const offer = await outfitOfferRepository.findById(prisma, offerId);
  if (!offer || offer.refundStatus !== OutfitOfferRefundStatus.PENDING) return;

  const payment = await outfitOfferRepository.findSucceededPayment(prisma, offerId);
  let refund: { result: string; rawResponse: unknown };
  try {
    refund = payment
      ? await refundOfferPayment(offer, payment.rawResponse, offer.brand.phone)
      : { result: OFFER_REFUND_RESULT.NEEDS_MANUAL_REFUND, rawResponse: { reason: "no payment" } };
  } catch (error) {
    logger.error(`Refund for offer ${offerId} failed: ${describeError(error)}`);
    refund = {
      result: OFFER_REFUND_RESULT.NEEDS_MANUAL_REFUND,
      rawResponse: { reason: "refund call failed" },
    };
  }

  const isRefunded = refund.result === OFFER_REFUND_RESULT.REFUNDED;
  await prisma.$transaction(async (tx) => {
    const isMoved = await outfitOfferRepository.setRefundStatus(
      tx,
      offerId,
      [OutfitOfferRefundStatus.PENDING],
      isRefunded
        ? { refundStatus: OutfitOfferRefundStatus.REFUNDED, refundedAt: new Date() }
        : { refundStatus: OutfitOfferRefundStatus.NEEDS_MANUAL_REFUND },
    );
    if (!isMoved) return;
    await outfitOfferRepository.recordRefundPayment(tx, {
      offerId,
      provider: offer.paymentMethod,
      status: isRefunded ? PaymentTransactionStatus.SUCCEEDED : PaymentTransactionStatus.FAILED,
      rawResponse: toStoredJson(refund.rawResponse),
    });
    if (isRefunded && offer.sentById) {
      await queueOfferNotice(tx, {
        offerId,
        type: NotificationType.OUTFIT_OFFER_REFUNDED,
        recipientIds: [offer.sentById],
        actorId: null,
      });
    }
  });
  if (!isRefunded) alertOpsOfManualOfferRefund(offer);
};

export const releaseToCreator = async (
  offer: LoadedOffer,
  fromStatuses: OutfitOfferStatus[],
): Promise<boolean> =>
  prisma.$transaction(async (tx) => {
    const releasedAt = new Date();
    const isMoved = await outfitOfferRepository.moveStatus(tx, offer.id, fromStatuses, {
      status: OutfitOfferStatus.RELEASED,
      payoutStatus: OutfitOfferPayoutStatus.AVAILABLE,
      releasedAt,
      closedAt: releasedAt,
    });
    if (isMoved) {
      await queueOfferNotice(tx, {
        offerId: offer.id,
        type: NotificationType.OUTFIT_OFFER_RELEASED,
        recipientIds: [offer.creatorId],
        actorId: null,
      });
    }
    return isMoved;
  });

export const closeWithRefund = async (
  client: DbClient,
  offer: LoadedOffer,
  fromStatuses: OutfitOfferStatus[],
  status: OutfitOfferStatus,
  closedReason: string,
): Promise<boolean> =>
  outfitOfferRepository.moveStatus(client, offer.id, fromStatuses, {
    status,
    closedReason,
    closedAt: new Date(),
    refundStatus: OutfitOfferRefundStatus.PENDING,
  });
