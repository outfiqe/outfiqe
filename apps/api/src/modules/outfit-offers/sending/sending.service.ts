import { prisma } from "#db/prisma.js";
import { NotificationType, OutfitOfferStatus, OutfitStatus } from "#generated/prisma/enums.js";
import { assertContentAllowed } from "#lib/content-check.utils.js";
import { withIdempotency } from "#lib/idempotency.utils.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { outfitErrors } from "#modules/outfits/outfit.errors.js";
import { outfitRepository } from "#modules/outfits/outfit.repository.js";
import { PaymentVerifyStatus } from "#modules/payments/payment.types.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";

import { OFFER_CLOSED_REASON, OFFER_VIEWER_SIDE } from "../outfit-offer.constants.js";
import { offerErrors } from "../outfit-offer.errors.js";
import { findViewerBrandId, requireBrandSide } from "../outfit-offer.guards.js";
import { queueOfferNotice } from "../outfit-offer.notifications.js";
import { checkOfferPayment, startOfferPayment } from "../outfit-offer.payments.js";
import { type LoadedOffer, outfitOfferRepository } from "../outfit-offer.repository.js";
import type { SendOfferBody } from "../outfit-offer.schemas.js";
import type { OfferPaymentCheck, SentOfferResult } from "../outfit-offer.types.js";
import {
  deadlineAfterDays,
  isAmountInRange,
  toOfferView,
  toStoredJson,
} from "../outfit-offer.utils.js";
import { reloadView } from "../outfit-offer.views.js";

const SEND_OFFER_ENDPOINT = "outfit-offers.send";

const settlePaidOffer = async (
  offer: LoadedOffer,
  paymentId: string,
  rawResponse: unknown,
): Promise<void> => {
  const acceptWithinDays = await platformSettingsService.get("outfit.offerAcceptWithinDays");
  const paidAt = new Date();
  await prisma.$transaction(async (tx) => {
    const isSettled = await outfitOfferRepository.settlePayment(
      tx,
      paymentId,
      toStoredJson(rawResponse),
    );
    if (!isSettled) return;
    const isMoved = await outfitOfferRepository.moveStatus(
      tx,
      offer.id,
      [OutfitOfferStatus.PAYMENT_PENDING],
      {
        status: OutfitOfferStatus.AWAITING_RESPONSE,
        paidAt,
        acceptBy: deadlineAfterDays(paidAt, acceptWithinDays),
      },
    );
    if (!isMoved) return;
    await queueOfferNotice(tx, {
      offerId: offer.id,
      type: NotificationType.OUTFIT_OFFER_RECEIVED,
      recipientIds: [offer.creatorId],
      actorId: offer.sentById,
    });
  });
};

export const verifyPendingPayment = async (offer: LoadedOffer): Promise<string> => {
  const payment = await outfitOfferRepository.findPendingPayment(prisma, offer.id);
  if (!payment) return PaymentVerifyStatus.FAILED;

  const { status, rawResponse } = await checkOfferPayment(offer, payment);
  if (status === PaymentVerifyStatus.COMPLETE) {
    await settlePaidOffer(offer, payment.id, rawResponse);
  } else if (status === PaymentVerifyStatus.FAILED) {
    await outfitOfferRepository.failPayment(prisma, payment.id, toStoredJson(rawResponse));
  }
  return status;
};

const requireOfferableBuild = async (userId: string, outfitId: string) => {
  const [brandId, memberRole, outfit] = await Promise.all([
    findViewerBrandId(userId),
    outfitRepository.findMemberRole(prisma, outfitId, userId),
    outfitRepository.findAccess(prisma, outfitId),
  ]);
  if (!outfit || outfit.removedAt !== null || !memberRole) throw outfitErrors.notFound();
  if (!brandId) throw offerErrors.notABrandOnBuild();
  if (outfit.status !== OutfitStatus.LOCKED) throw offerErrors.buildNotLocked();
  const lockedVersion = await outfitRepository.findLatestSnapshotVersion(prisma, outfitId);
  if (lockedVersion === null) throw offerErrors.buildNotLocked();
  return { brandId, lockedVersion };
};

const assertAmountAllowed = async (amount: number): Promise<void> => {
  const [minimum, maximum] = await Promise.all([
    platformSettingsService.get("outfit.offerMinAmount"),
    platformSettingsService.get("outfit.offerMaxAmount"),
  ]);
  if (!isAmountInRange(amount, minimum, maximum)) {
    throw offerErrors.amountOutOfRange(minimum, maximum);
  }
};

const sendOnce = async (
  userId: string,
  outfitId: string,
  { creatorId, amount, paymentMethod, note }: SendOfferBody,
): Promise<SentOfferResult> => {
  const { brandId, lockedVersion } = await requireOfferableBuild(userId, outfitId);
  if (creatorId === userId) throw offerErrors.creatorNotOnBuild();
  const isCreatorOnBuild = await outfitOfferRepository.isApprovedCreatorMember(
    prisma,
    outfitId,
    creatorId,
  );
  if (!isCreatorOnBuild) throw offerErrors.creatorNotOnBuild();
  await assertAmountAllowed(amount);
  assertContentAllowed(note);

  let created: { offer: LoadedOffer; paymentId: string };
  try {
    created = await prisma.$transaction(async (tx) => {
      const offer = await outfitOfferRepository.create(tx, {
        outfitId,
        outfitVersion: lockedVersion,
        brandId,
        sentById: userId,
        creatorId,
        amount,
        note: note ?? null,
        paymentMethod,
      });
      const payment = await outfitOfferRepository.createPayment(tx, {
        offerId: offer.id,
        provider: paymentMethod,
      });
      return { offer, paymentId: payment.id };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw offerErrors.alreadyOpen();
    throw error;
  }

  const { offer, paymentId } = created;
  try {
    const payment = await startOfferPayment(offer, paymentId);
    if (payment.providerRef) {
      await outfitOfferRepository.setPaymentRef(paymentId, payment.providerRef);
    }
    return { offer: toOfferView(offer, OFFER_VIEWER_SIDE.BRAND), payment };
  } catch (error) {
    await outfitOfferRepository.failPayment(prisma, paymentId, { reason: "initiate failed" });
    await outfitOfferRepository.moveStatus(prisma, offer.id, [OutfitOfferStatus.PAYMENT_PENDING], {
      status: OutfitOfferStatus.PAYMENT_FAILED,
      closedReason: OFFER_CLOSED_REASON.PAYMENT_NOT_COMPLETED,
      closedAt: new Date(),
    });
    throw error;
  }
};

export const outfitOfferSendingService = {
  async send(
    userId: string,
    outfitId: string,
    body: SendOfferBody,
    idempotencyKey: string | undefined,
  ): Promise<SentOfferResult> {
    return withIdempotency(
      userId,
      `${SEND_OFFER_ENDPOINT}:${outfitId}`,
      idempotencyKey,
      () => sendOnce(userId, outfitId, body),
      body,
    );
  },

  async retryPayment(userId: string, offerId: string): Promise<SentOfferResult> {
    const offer = await requireBrandSide(offerId, userId);
    if (offer.status !== OutfitOfferStatus.PAYMENT_PENDING) {
      throw offerErrors.invalidTransition("This offer is no longer waiting for payment.");
    }
    const priorStatus = await verifyPendingPayment(offer);
    if (priorStatus === PaymentVerifyStatus.COMPLETE) {
      throw offerErrors.invalidTransition("This offer has already been paid.");
    }
    const pendingPayment = await outfitOfferRepository.findPendingPayment(prisma, offerId);
    if (pendingPayment) {
      await outfitOfferRepository.failPayment(prisma, pendingPayment.id, {
        supersededByRetry: true,
      });
    }
    const { id: paymentId } = await outfitOfferRepository.createPayment(prisma, {
      offerId,
      provider: offer.paymentMethod,
    });
    const payment = await startOfferPayment(offer, paymentId);
    if (payment.providerRef) {
      await outfitOfferRepository.setPaymentRef(paymentId, payment.providerRef);
    }
    return { offer: toOfferView(offer, OFFER_VIEWER_SIDE.BRAND), payment };
  },

  async verifyPayment(userId: string, offerId: string): Promise<OfferPaymentCheck> {
    const offer = await requireBrandSide(offerId, userId);
    const status =
      offer.status === OutfitOfferStatus.PAYMENT_PENDING ? await verifyPendingPayment(offer) : null;
    const view = await reloadView(offerId, OFFER_VIEWER_SIDE.BRAND);
    const isPaid =
      view.status !== OutfitOfferStatus.PAYMENT_PENDING &&
      view.status !== OutfitOfferStatus.PAYMENT_FAILED;
    return {
      offer: view,
      isPaid,
      isFailed:
        view.status === OutfitOfferStatus.PAYMENT_FAILED || status === PaymentVerifyStatus.FAILED,
    };
  },
};
