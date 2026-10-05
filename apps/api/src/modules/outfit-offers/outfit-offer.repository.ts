import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  AccountStatus,
  CreatorStatus,
  OutfitOfferPayoutStatus,
  OutfitOfferRefundStatus,
  OutfitOfferStatus,
  type PaymentMethod,
  PaymentTransactionStatus,
  PaymentTransactionType,
  UserRole,
} from "#generated/prisma/enums.js";
import { outfitPersonSelect } from "#modules/outfits/outfit.repository.js";
import type { DbClient } from "#types/db.types.js";

import type { OfferRow } from "./outfit-offer.utils.js";

export const offerRowSelect = {
  id: true,
  outfitId: true,
  outfitVersion: true,
  brandId: true,
  sentById: true,
  creatorId: true,
  amount: true,
  note: true,
  paymentMethod: true,
  status: true,
  refundStatus: true,
  payoutStatus: true,
  acceptBy: true,
  postBy: true,
  lookId: true,
  postedAt: true,
  releaseAt: true,
  releasedAt: true,
  refundedAt: true,
  closedReason: true,
  createdAt: true,
  outfit: { select: { title: true } },
  brand: { select: { id: true, name: true, phone: true } },
  creator: { select: outfitPersonSelect },
} as const satisfies Prisma.OutfitOfferSelect;

export type LoadedOffer = OfferRow & {
  brandId: string;
  sentById: string | null;
  creatorId: string;
  brand: { id: string; name: string; phone: string };
};

type PageParams = { cursor?: string; limit: number };

const LOOKAHEAD_ROW = 1;
const NOTHING = 0;

const pageArgs = ({ cursor, limit }: PageParams) => ({
  orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
  take: limit + LOOKAHEAD_ROW,
  ...(cursor ? { cursor: { id: cursor }, skip: LOOKAHEAD_ROW } : {}),
});

export type CreateOfferInput = {
  outfitId: string;
  outfitVersion: number;
  brandId: string;
  sentById: string;
  creatorId: string;
  amount: number;
  note: string | null;
  paymentMethod: PaymentMethod;
};

export const outfitOfferRepository = {
  async isApprovedCreatorMember(
    client: DbClient,
    outfitId: string,
    creatorId: string,
  ): Promise<boolean> {
    const member = await client.outfitMember.findFirst({
      where: {
        outfitId,
        userId: creatorId,
        user: {
          role: UserRole.CUSTOMER,
          accountStatus: AccountStatus.ACTIVE,
          isCreator: true,
          creatorStatus: CreatorStatus.APPROVED,
        },
      },
      select: { userId: true },
    });
    return member !== null;
  },

  async create(client: DbClient, input: CreateOfferInput): Promise<LoadedOffer> {
    return client.outfitOffer.create({ data: input, select: offerRowSelect });
  },

  async findById(client: DbClient, offerId: string): Promise<LoadedOffer | null> {
    return client.outfitOffer.findUnique({ where: { id: offerId }, select: offerRowSelect });
  },

  async moveStatus(
    client: DbClient,
    offerId: string,
    fromStatuses: OutfitOfferStatus[],
    data: Prisma.OutfitOfferUncheckedUpdateManyInput,
  ): Promise<boolean> {
    const { count } = await client.outfitOffer.updateMany({
      where: { id: offerId, status: { in: fromStatuses } },
      data,
    });
    return count > NOTHING;
  },

  async setRefundStatus(
    client: DbClient,
    offerId: string,
    fromStatuses: OutfitOfferRefundStatus[],
    data: Prisma.OutfitOfferUpdateManyMutationInput,
  ): Promise<boolean> {
    const { count } = await client.outfitOffer.updateMany({
      where: { id: offerId, refundStatus: { in: fromStatuses } },
      data,
    });
    return count > NOTHING;
  },

  async createPayment(
    client: DbClient,
    input: { offerId: string; provider: PaymentMethod; type?: PaymentTransactionType },
  ): Promise<{ id: string; createdAt: Date }> {
    return client.outfitOfferPayment.create({
      data: { ...input, type: input.type ?? PaymentTransactionType.PAYMENT },
      select: { id: true, createdAt: true },
    });
  },

  async recordRefundPayment(
    client: DbClient,
    input: {
      offerId: string;
      provider: PaymentMethod;
      status: PaymentTransactionStatus;
      rawResponse: Prisma.InputJsonValue;
    },
  ): Promise<void> {
    await client.outfitOfferPayment.create({
      data: { ...input, type: PaymentTransactionType.REFUND },
    });
  },

  async setPaymentRef(paymentId: string, transactionRef: string): Promise<void> {
    await prisma.outfitOfferPayment.update({ where: { id: paymentId }, data: { transactionRef } });
  },

  async findPendingPayment(client: DbClient, offerId: string) {
    return client.outfitOfferPayment.findFirst({
      where: {
        offerId,
        type: PaymentTransactionType.PAYMENT,
        status: PaymentTransactionStatus.INITIATED,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, transactionRef: true, createdAt: true },
    });
  },

  async findSucceededPayment(client: DbClient, offerId: string) {
    return client.outfitOfferPayment.findFirst({
      where: {
        offerId,
        type: PaymentTransactionType.PAYMENT,
        status: PaymentTransactionStatus.SUCCEEDED,
      },
      select: { id: true, rawResponse: true },
    });
  },

  async settlePayment(
    client: DbClient,
    paymentId: string,
    rawResponse: Prisma.InputJsonValue,
  ): Promise<boolean> {
    const { count } = await client.outfitOfferPayment.updateMany({
      where: { id: paymentId, status: PaymentTransactionStatus.INITIATED },
      data: { status: PaymentTransactionStatus.SUCCEEDED, rawResponse },
    });
    return count > NOTHING;
  },

  async failPayment(
    client: DbClient,
    paymentId: string,
    rawResponse: Prisma.InputJsonValue,
  ): Promise<void> {
    await client.outfitOfferPayment.updateMany({
      where: { id: paymentId, status: PaymentTransactionStatus.INITIATED },
      data: { status: PaymentTransactionStatus.FAILED, rawResponse },
    });
  },

  async listForBrand(brandId: string, page: PageParams): Promise<LoadedOffer[]> {
    return prisma.outfitOffer.findMany({
      where: { brandId },
      ...pageArgs(page),
      select: offerRowSelect,
    });
  },

  async listForCreator(creatorId: string, page: PageParams): Promise<LoadedOffer[]> {
    return prisma.outfitOffer.findMany({
      where: {
        creatorId,
        status: { notIn: [OutfitOfferStatus.PAYMENT_PENDING, OutfitOfferStatus.PAYMENT_FAILED] },
      },
      ...pageArgs(page),
      select: offerRowSelect,
    });
  },

  async listForOutfit(outfitId: string, viewer: { brandId?: string; creatorId: string }) {
    return prisma.outfitOffer.findMany({
      where: {
        outfitId,
        OR: [
          ...(viewer.brandId ? [{ brandId: viewer.brandId }] : []),
          {
            creatorId: viewer.creatorId,
            status: {
              notIn: [OutfitOfferStatus.PAYMENT_PENDING, OutfitOfferStatus.PAYMENT_FAILED],
            },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: offerRowSelect,
    });
  },

  async listForAdmin(
    filters: {
      status?: OutfitOfferStatus;
      refundStatus?: OutfitOfferRefundStatus;
      payoutStatus?: OutfitOfferPayoutStatus;
    },
    page: PageParams,
  ): Promise<LoadedOffer[]> {
    return prisma.outfitOffer.findMany({
      where: filters,
      ...pageArgs(page),
      select: offerRowSelect,
    });
  },

  async findAcceptedForLook(
    client: DbClient,
    {
      creatorId,
      outfitId,
      outfitVersion,
    }: { creatorId: string; outfitId: string; outfitVersion: number },
  ): Promise<{ id: string } | null> {
    return client.outfitOffer.findFirst({
      where: { creatorId, outfitId, outfitVersion, status: OutfitOfferStatus.ACCEPTED },
      select: { id: true },
    });
  },

  async listIdsByStatusBefore(
    status: OutfitOfferStatus,
    deadlineField: "acceptBy" | "postBy" | "releaseAt",
    now: Date,
  ): Promise<string[]> {
    const offers = await prisma.outfitOffer.findMany({
      where: { status, [deadlineField]: { lte: now } },
      select: { id: true },
    });
    return offers.map(({ id }) => id);
  },

  async listUnpaidIdsCreatedBefore(createdBefore: Date): Promise<string[]> {
    const offers = await prisma.outfitOffer.findMany({
      where: { status: OutfitOfferStatus.PAYMENT_PENDING, createdAt: { lte: createdBefore } },
      select: { id: true },
    });
    return offers.map(({ id }) => id);
  },

  async listPostedIdsWithRemovedLook(): Promise<string[]> {
    const offers = await prisma.outfitOffer.findMany({
      where: {
        status: OutfitOfferStatus.POSTED,
        OR: [{ lookId: null }, { look: { deletedAt: { not: null } } }],
      },
      select: { id: true },
    });
    return offers.map(({ id }) => id);
  },

  async listIdsAwaitingRefund(updatedBefore: Date): Promise<string[]> {
    const offers = await prisma.outfitOffer.findMany({
      where: { refundStatus: OutfitOfferRefundStatus.PENDING, updatedAt: { lte: updatedBefore } },
      select: { id: true },
    });
    return offers.map(({ id }) => id);
  },

  async findLiveLookFromVersion(
    client: DbClient,
    {
      creatorId,
      outfitId,
      outfitVersion,
    }: { creatorId: string; outfitId: string; outfitVersion: number },
  ): Promise<string | null> {
    const look = await client.creatorLook.findFirst({
      where: {
        creatorId,
        sourceOutfitId: outfitId,
        sourceOutfitVersion: outfitVersion,
        deletedAt: null,
        fulfilledOffer: null,
      },
      select: { id: true },
    });
    return look?.id ?? null;
  },

  async isLookLive(client: DbClient, lookId: string | null): Promise<boolean> {
    if (!lookId) return false;
    const look = await client.creatorLook.findFirst({
      where: { id: lookId, deletedAt: null },
      select: { id: true },
    });
    return look !== null;
  },

  async sumPayoutsByStatusForCreator(
    creatorId: string,
  ): Promise<Partial<Record<OutfitOfferPayoutStatus, number>>> {
    const grouped = await prisma.outfitOffer.groupBy({
      by: ["payoutStatus"],
      where: { creatorId },
      _sum: { amount: true },
    });
    const sums: Partial<Record<OutfitOfferPayoutStatus, number>> = {};
    for (const { payoutStatus, _sum } of grouped) {
      sums[payoutStatus] = _sum.amount ?? NOTHING;
    }
    return sums;
  },

  async sumPostedForCreator(creatorId: string): Promise<number> {
    const { _sum } = await prisma.outfitOffer.aggregate({
      where: { creatorId, status: OutfitOfferStatus.POSTED },
      _sum: { amount: true },
    });
    return _sum.amount ?? NOTHING;
  },

  async hasPayoutForCreator(creatorId: string): Promise<boolean> {
    const offer = await prisma.outfitOffer.findFirst({
      where: { creatorId, payoutStatus: { not: OutfitOfferPayoutStatus.NONE } },
      select: { id: true },
    });
    return offer !== null;
  },

  async listAvailablePayoutsForCreator(
    client: DbClient,
    creatorId: string,
  ): Promise<{ id: string; amount: number; createdAt: Date }[]> {
    const offers = await client.outfitOffer.findMany({
      where: { creatorId, payoutStatus: OutfitOfferPayoutStatus.AVAILABLE },
      orderBy: { releasedAt: "asc" },
      select: { id: true, amount: true, releasedAt: true, createdAt: true },
    });
    return offers.map(({ id, amount, releasedAt, createdAt }) => ({
      id,
      amount,
      createdAt: releasedAt ?? createdAt,
    }));
  },

  async markPayoutsPaid(client: DbClient, offerIds: string[]): Promise<number> {
    if (offerIds.length === NOTHING) return NOTHING;
    const { count } = await client.outfitOffer.updateMany({
      where: { id: { in: offerIds }, payoutStatus: OutfitOfferPayoutStatus.AVAILABLE },
      data: { payoutStatus: OutfitOfferPayoutStatus.PAID, paidOutAt: new Date() },
    });
    return count;
  },
};
