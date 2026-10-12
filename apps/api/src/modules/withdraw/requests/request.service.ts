import { env } from "#config/env.config.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { withdrawRequestReceivedInternalTemplate } from "#email-templates/order.templates.js";
import { Prisma } from "#generated/prisma/client.js";
import {
  BrandPayoutStatus,
  CommissionStatus,
  OutfitOfferPayoutStatus,
  WithdrawRequestStatus,
} from "#generated/prisma/enums.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { requireCommissionEarner } from "#lib/creator-guard.utils.js";
import { sendEmail } from "#lib/email.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { isTransactionConflictError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { bankAccountRepository } from "#modules/bank-accounts/bank-account.repository.js";
import { brandBankAccountRepository } from "#modules/brand-bank-accounts/brand-bank-account.repository.js";
import { brandPayoutRepository } from "#modules/brand-payouts/brand-payout.repository.js";
import { brandRepository } from "#modules/brands/brand.repository.js";
import { commissionRepository } from "#modules/commissions/commission.repository.js";
import { outfitOfferRepository } from "#modules/outfit-offers/outfit-offer.repository.js";
import { userRepository } from "#modules/users/user.repository.js";

import { withdrawRepository } from "../withdraw.repository.js";
import type { CreateWithdrawRequestBody, ListWithdrawRequestsQuery } from "../withdraw.schemas.js";
import type {
  OwnerContext,
  WithdrawEligibilityView,
  WithdrawRequestView,
} from "../withdraw.types.js";
import { toWithdrawRequestView } from "../withdraw.utils.js";
import { computeWithdrawWindow } from "../withdraw.window.utils.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const resolveOwner = async (
  userId: string,
  ownerType: OwnerContext["ownerType"],
): Promise<OwnerContext> => {
  if (ownerType === "CREATOR") {
    await requireCommissionEarner(userId, "You don't have any commission earnings to withdraw.");
    return { ownerType, creatorId: userId };
  }
  const brandId = await requireBrandId(userId);
  return { ownerType, brandId };
};

const getAvailableLedgerBalance = async (owner: OwnerContext): Promise<number> => {
  if (owner.ownerType === "CREATOR") {
    const [commissionSums, offerPayoutSums] = await Promise.all([
      commissionRepository.sumByStatusForCreator(owner.creatorId),
      outfitOfferRepository.sumPayoutsByStatusForCreator(owner.creatorId),
    ]);
    return (
      (commissionSums[CommissionStatus.AVAILABLE] ?? 0) +
      (offerPayoutSums[OutfitOfferPayoutStatus.AVAILABLE] ?? 0)
    );
  }
  const [payoutSums, buildCommissionSums] = await Promise.all([
    brandPayoutRepository.sumByStatusForBrand(owner.brandId),
    commissionRepository.sumByStatusForBrand(owner.brandId),
  ]);
  return (
    (payoutSums[BrandPayoutStatus.AVAILABLE] ?? 0) +
    (buildCommissionSums[CommissionStatus.AVAILABLE] ?? 0)
  );
};

const hasVerifiedBankAccount = async (
  owner: OwnerContext,
  bankAccountId: string,
): Promise<boolean> => {
  if (owner.ownerType === "CREATOR") {
    const account = await bankAccountRepository.findById(bankAccountId);
    return !!account && account.userId === owner.creatorId && account.isVerified;
  }
  const account = await brandBankAccountRepository.findById(bankAccountId);
  return !!account && account.brandId === owner.brandId && account.isVerified;
};

const anyVerifiedBankAccountExists = async (owner: OwnerContext): Promise<boolean> => {
  if (owner.ownerType === "CREATOR") {
    const accounts = await bankAccountRepository.listForUser(owner.creatorId);
    return accounts.some((account) => account.isVerified);
  }
  const accounts = await brandBankAccountRepository.listForBrand(owner.brandId);
  return accounts.some((account) => account.isVerified);
};

const getOwnerDisplayName = async (owner: OwnerContext): Promise<string> => {
  if (owner.ownerType === "CREATOR") {
    const user = await userRepository.findById(owner.creatorId);
    return user?.name ?? "Unknown muse";
  }
  const brand = await brandRepository.findById(owner.brandId);
  return brand?.name ?? "Unknown brand";
};

export const withdrawRequestService = {
  async getEligibility(
    userId: string,
    ownerType: OwnerContext["ownerType"],
  ): Promise<WithdrawEligibilityView> {
    const owner = await resolveOwner(userId, ownerType);
    const policy = await withdrawRepository.getOrCreateActivePolicy(ownerType);
    const window = computeWithdrawWindow(policy);

    const attemptsUsed = await withdrawRepository.countRequestsSince(owner, window.windowStart);
    const attemptsRemaining = Math.max(0, policy.maxAttemptsPerWindow - attemptsUsed);

    const reserved = await withdrawRepository.sumReservedAmount(owner);
    const ledgerAvailable = await getAvailableLedgerBalance(owner);
    const availableBalance = Math.max(0, ledgerAvailable - reserved);

    const mostRecentRejection = await withdrawRepository.findMostRecentRejection(owner);
    const cooldownEndsAt =
      mostRecentRejection?.reviewedAt && policy.cooldownAfterRejectionDays > 0
        ? new Date(
            mostRecentRejection.reviewedAt.getTime() +
              policy.cooldownAfterRejectionDays * MS_PER_DAY,
          )
        : null;
    const cooldownActive = !!cooldownEndsAt && cooldownEndsAt > new Date();

    return {
      windowOpen: window.isOpen,
      nextWindowOpensAt: window.nextWindowOpensAt.toISOString(),
      attemptsUsed,
      attemptsRemaining,
      minAmount: policy.minAmount,
      maxAmount: policy.maxAmount,
      availableBalance,
      hasVerifiedBankAccount: await anyVerifiedBankAccountExists(owner),
      cooldownActive,
      cooldownEndsAt: cooldownEndsAt?.toISOString() ?? null,
    };
  },

  async createRequest(
    userId: string,
    body: CreateWithdrawRequestBody,
  ): Promise<WithdrawRequestView> {
    const owner = await resolveOwner(userId, body.ownerType);

    const bankAccountVerified = await hasVerifiedBankAccount(owner, body.bankAccountId);
    if (!bankAccountVerified) {
      throw new AppError(
        "BANK_ACCOUNT_NOT_VERIFIED",
        "Add and verify a bank account before requesting a withdrawal.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const ledgerAvailable = await getAvailableLedgerBalance(owner);

    try {
      const request = await prisma.$transaction(
        async (tx) => {
          const policy = await withdrawRepository.getOrCreateActivePolicy(body.ownerType, tx);
          const window = computeWithdrawWindow(policy);
          if (!window.isOpen) {
            throw new AppError(
              "WINDOW_CLOSED",
              "The withdrawal window isn't open right now.",
              HTTP_STATUS.BAD_REQUEST,
            );
          }

          const attemptsUsed = await withdrawRepository.countRequestsSince(
            owner,
            window.windowStart,
            tx,
          );
          if (attemptsUsed >= policy.maxAttemptsPerWindow) {
            throw new AppError(
              "ATTEMPTS_EXHAUSTED",
              "You've reached the withdrawal limit for this window.",
              HTTP_STATUS.BAD_REQUEST,
            );
          }

          const mostRecentRejection = await withdrawRepository.findMostRecentRejection(owner, tx);
          if (mostRecentRejection?.reviewedAt && policy.cooldownAfterRejectionDays > 0) {
            const cooldownEndsAt = new Date(
              mostRecentRejection.reviewedAt.getTime() +
                policy.cooldownAfterRejectionDays * MS_PER_DAY,
            );
            if (cooldownEndsAt > new Date()) {
              throw new AppError(
                "COOLDOWN_ACTIVE",
                "You're still in the cooldown period after a recent rejection.",
                HTTP_STATUS.BAD_REQUEST,
              );
            }
          }

          if (body.amount < policy.minAmount) {
            throw new AppError(
              "AMOUNT_TOO_LOW",
              `The minimum withdrawal amount is Rs. ${policy.minAmount}.`,
              HTTP_STATUS.BAD_REQUEST,
            );
          }

          const isOverSoftCeiling = body.amount > policy.maxAmount;
          if (isOverSoftCeiling && body.ownerType === "CREATOR") {
            throw new AppError(
              "AMOUNT_TOO_HIGH",
              `The maximum withdrawal amount is Rs. ${policy.maxAmount}.`,
              HTTP_STATUS.BAD_REQUEST,
            );
          }

          const reserved = await withdrawRepository.sumReservedAmount(owner, tx);
          const availableBalance = ledgerAvailable - reserved;
          if (body.amount > availableBalance) {
            throw new AppError(
              "INSUFFICIENT_BALANCE",
              "This amount exceeds your available balance.",
              HTTP_STATUS.BAD_REQUEST,
            );
          }

          const requiresSecondSignOff = isOverSoftCeiling && body.ownerType === "BUSINESS";

          return withdrawRepository.create(tx, {
            owner,
            requestedById: userId,
            bankAccountId: body.bankAccountId,
            amount: body.amount,
            policyId: policy.id,
            status: requiresSecondSignOff
              ? WithdrawRequestStatus.UNDER_REVIEW
              : WithdrawRequestStatus.PENDING,
            requiresSecondSignOff,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      const ownerName = await getOwnerDisplayName(owner);
      const { subject, html } = withdrawRequestReceivedInternalTemplate({
        ownerName,
        ownerType: body.ownerType,
        amount: body.amount,
        reviewUrl: `${env.ADMIN_URL}/withdraw-requests`,
      });
      void sendEmail({
        to: env.OPS_NOTIFICATION_EMAIL,
        subject,
        body: `${ownerName} requested a withdrawal of Rs. ${body.amount}.`,
        html,
      });

      return toWithdrawRequestView(request);
    } catch (error) {
      if (isTransactionConflictError(error)) {
        throw new AppError(
          "WITHDRAW_REQUEST_CONFLICT",
          "Please try again — something else changed your balance just now.",
          HTTP_STATUS.CONFLICT,
        );
      }
      throw error;
    }
  },

  async listMine(
    userId: string,
    query: ListWithdrawRequestsQuery,
  ): Promise<{ items: WithdrawRequestView[]; nextCursor: string | null }> {
    const owner = await resolveOwner(userId, query.ownerType);
    const rows = await withdrawRepository.listForOwner(owner, query);
    const { items: pagedRows, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);

    return { items: pagedRows.map(toWithdrawRequestView), nextCursor };
  },
};
