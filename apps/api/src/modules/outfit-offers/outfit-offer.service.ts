import { env } from "#config/env.config.js";
import { prisma } from "#db/prisma.js";
import {
  NotificationType,
  OutfitOfferPayoutStatus,
  OutfitOfferRefundStatus,
  OutfitOfferStatus,
  OutfitStatus,
  PaymentTransactionStatus,
} from "#generated/prisma/enums.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { assertContentAllowed } from "#lib/content-check.utils.js";
import { sendEmail } from "#lib/email.utils.js";
import { withIdempotency } from "#lib/idempotency.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import logger from "#lib/winston.utils.js";
import { outfitErrors } from "#modules/outfits/outfit.errors.js";
import { outfitRepository } from "#modules/outfits/outfit.repository.js";
import { PaymentVerifyStatus } from "#modules/payments/payment.types.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { describeError } from "#redis/redis.utils.js";
import type { DbClient } from "#types/db.types.js";

import {
  OFFER_AUDIT_TARGET_TYPE,
  OFFER_CLOSED_REASON,
  OFFER_REFUND_RESULT,
  OFFER_VIEWER_SIDE,
} from "./outfit-offer.constants.js";
import { offerErrors } from "./outfit-offer.errors.js";
import { queueOfferNotice } from "./outfit-offer.notifications.js";
import {
  checkOfferPayment,
  refundOfferPayment,
  startOfferPayment,
} from "./outfit-offer.payments.js";
import { type LoadedOffer, outfitOfferRepository } from "./outfit-offer.repository.js";
import type {
  AdminOfferActionBody,
  ListAdminOffersQuery,
  ListOffersQuery,
  SendOfferBody,
} from "./outfit-offer.schemas.js";
import type {
  OfferPage,
  OfferPaymentCheck,
  OfferView,
  OfferViewerSide,
  SentOfferResult,
} from "./outfit-offer.types.js";
import {
  deadlineAfterDays,
  isAmountInRange,
  toOfferView,
  toStoredJson,
} from "./outfit-offer.utils.js";

const SEND_OFFER_ENDPOINT = "outfit-offers.send";

const PAID_OPEN_STATUSES: OutfitOfferStatus[] = [
  OutfitOfferStatus.AWAITING_RESPONSE,
  OutfitOfferStatus.ACCEPTED,
  OutfitOfferStatus.POSTED,
];

const sideFor = (
  offer: LoadedOffer,
  userId: string,
  brandId: string | null,
): OfferViewerSide | null => {
  if (offer.creatorId === userId) return OFFER_VIEWER_SIDE.CREATOR;
  if (brandId !== null && offer.brandId === brandId) return OFFER_VIEWER_SIDE.BRAND;
  return null;
};

const findViewerBrandId = async (userId: string): Promise<string | null> => {
  try {
    return await requireBrandId(userId);
  } catch {
    return null;
  }
};

const requireOfferForViewer = async (
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

const requireBrandSide = async (offerId: string, userId: string): Promise<LoadedOffer> => {
  const { offer, side } = await requireOfferForViewer(offerId, userId);
  if (side !== OFFER_VIEWER_SIDE.BRAND) throw offerErrors.notFound();
  return offer;
};

const requireCreatorSide = async (offerId: string, userId: string): Promise<LoadedOffer> => {
  const { offer, side } = await requireOfferForViewer(offerId, userId);
  if (side !== OFFER_VIEWER_SIDE.CREATOR) throw offerErrors.notFound();
  return offer;
};

const reloadView = async (offerId: string, side: OfferViewerSide): Promise<OfferView> => {
  const offer = await outfitOfferRepository.findById(prisma, offerId);
  if (!offer) throw offerErrors.notFound();
  return toOfferView(offer, side);
};

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

const pageOf = (
  rows: LoadedOffer[],
  limit: number,
  sideOf: (offer: LoadedOffer) => OfferViewerSide,
): OfferPage => {
  const { items, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);
  return { items: items.map((offer) => toOfferView(offer, sideOf(offer))), nextCursor };
};

export const outfitOfferService = {
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
      await outfitOfferService.recordPostedLook(prisma, {
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
      throw offerErrors.invalidTransition(
        "Only offers the creator hasn't answered can be cancelled.",
      );
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
      throw offerErrors.invalidTransition("Only accepted or posted offers can be released.");
    }
    await platformAudit.record({
      actorUserId: adminUserId,
      action: PLATFORM_AUDIT_ACTION.OUTFIT_OFFER_RELEASED_BY_ADMIN,
      summary: `Released Rs. ${offer.amount} from ${offer.brand.name} to the creator: ${reason}`,
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
