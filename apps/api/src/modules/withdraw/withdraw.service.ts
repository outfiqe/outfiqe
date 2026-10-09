import { env } from "#config/env.config.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { withdrawRequestReceivedInternalTemplate } from "#email-templates/order.templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
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

import { LEDGER_ROW_KIND } from "./withdraw.constants.js";
import { withdrawRepository } from "./withdraw.repository.js";
import type {
  ApproveWithdrawRequestBody,
  CreateWithdrawRequestBody,
  ListAdminWithdrawRequestsQuery,
  ListWithdrawRequestsQuery,
  UpdateWithdrawPolicyBody,
} from "./withdraw.schemas.js";
import type {
  AdminWithdrawRequestView,
  ClaimedLedgerRows,
  LedgerRow,
  LedgerRowKind,
  OwnerContext,
  WithdrawEligibilityView,
  WithdrawPolicyView,
  WithdrawRequestRecord,
  WithdrawRequestView,
} from "./withdraw.types.js";
import {
  idsOfKind,
  pickOldestRowsCoveringAmount,
  toAdminWithdrawRequestView,
  toWithdrawPolicyView,
  toWithdrawRequestView,
} from "./withdraw.utils.js";
import { computeWithdrawWindow } from "./withdraw.window.utils.js";

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

const publishWithdrawRequestStatusChanged = async (
  requestRecord: WithdrawRequestRecord,
  adminId: string,
  status: WithdrawRequestStatus,
  rejectionReason: string | null = null,
): Promise<void> => {
  await eventBus.publish(DomainEvents.WITHDRAW_REQUEST_STATUS_CHANGED, {
    requestId: requestRecord.id,
    requestedById: requestRecord.requestedById,
    actorId: adminId,
    status,
    amount: requestRecord.amount,
    rejectionReason,
  });
};

export const withdrawService = {
  async getPolicy(ownerType: OwnerContext["ownerType"]): Promise<WithdrawPolicyView> {
    const policy = await withdrawRepository.getOrCreateActivePolicy(ownerType);
    const window = computeWithdrawWindow(policy);
    return toWithdrawPolicyView(policy, window);
  },

  async updatePolicy(body: UpdateWithdrawPolicyBody, adminId: string): Promise<WithdrawPolicyView> {
    const { ownerType, ...fields } = body;
    const policy = await withdrawRepository.createActiveVersion(ownerType, fields, adminId);
    const window = computeWithdrawWindow(policy);
    return toWithdrawPolicyView(policy, window);
  },

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

  async listAllAdmin(
    query: ListAdminWithdrawRequestsQuery,
  ): Promise<{ items: AdminWithdrawRequestView[]; nextCursor: string | null }> {
    const rows = await withdrawRepository.listAllAdmin(query);
    const { items: pagedRows, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);

    return { items: pagedRows.map(toAdminWithdrawRequestView), nextCursor };
  },

  async approve(
    requestId: string,
    adminId: string,
    body: ApproveWithdrawRequestBody,
  ): Promise<void> {
    const { isFinalApproval, requestRecord } = await prisma.$transaction(async (tx) => {
      const requestRecord = await withdrawRepository.findById(requestId, tx);
      if (!requestRecord) {
        throw new AppError("NOT_FOUND", "Withdraw request not found.", HTTP_STATUS.NOT_FOUND);
      }

      if (
        requestRecord.requiresSecondSignOff &&
        requestRecord.firstApprovedById !== null &&
        requestRecord.firstApprovedById === adminId
      ) {
        throw new AppError(
          "SAME_ADMIN_SIGN_OFF",
          "A second sign-off must come from a different admin.",
          HTTP_STATUS.CONFLICT,
        );
      }

      const isFinalApproval =
        !requestRecord.requiresSecondSignOff || requestRecord.firstApprovedById !== null;

      if (isFinalApproval) {
        const bankAccountId = requestRecord.bankAccountId ?? requestRecord.brandBankAccountId;
        if (!bankAccountId) {
          throw new AppError(
            "NOT_FOUND",
            "This request has no bank account.",
            HTTP_STATUS.NOT_FOUND,
          );
        }

        const alreadyCrossChecked =
          requestRecord.ownerType === "CREATOR"
            ? (await tx.bankAccount.findUnique({ where: { id: bankAccountId } }))
                ?.firstPayoutCrossCheckedAt
            : (await tx.brandBankAccount.findUnique({ where: { id: bankAccountId } }))
                ?.firstPayoutCrossCheckedAt;

        if (!alreadyCrossChecked && !body.identityCrossCheckConfirmed) {
          throw new AppError(
            "IDENTITY_CROSS_CHECK_REQUIRED",
            "Confirm the identity/bank-name cross-check before approving this account's first payout.",
            HTTP_STATUS.BAD_REQUEST,
          );
        }

        if (!alreadyCrossChecked) {
          if (requestRecord.ownerType === "CREATOR") {
            await bankAccountRepository.stampFirstPayoutCrossCheck(bankAccountId, adminId, tx);
          } else {
            await brandBankAccountRepository.stampFirstPayoutCrossCheck(bankAccountId, adminId, tx);
          }
        }
      }

      const transitioned = requestRecord.requiresSecondSignOff
        ? requestRecord.firstApprovedById === null
          ? await withdrawRepository.approveFirstSignOff(requestId, adminId, tx)
          : await withdrawRepository.approveSecondSignOff(requestId, adminId, tx)
        : await withdrawRepository.approveDirect(requestId, adminId, tx);

      if (!transitioned) {
        throw new AppError(
          "INVALID_TRANSITION",
          "This request can no longer be approved from its current state.",
          HTTP_STATUS.CONFLICT,
        );
      }

      return { isFinalApproval, requestRecord };
    });

    if (isFinalApproval) {
      await publishWithdrawRequestStatusChanged(
        requestRecord,
        adminId,
        WithdrawRequestStatus.APPROVED,
      );
    }
  },

  async reject(requestId: string, adminId: string, reason: string): Promise<void> {
    const rejected = await withdrawRepository.reject(requestId, adminId, reason);
    if (!rejected) {
      throw new AppError(
        "INVALID_TRANSITION",
        "This request can no longer be rejected from its current state.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const requestRecord = await withdrawRepository.findById(requestId);
    if (requestRecord) {
      await publishWithdrawRequestStatusChanged(
        requestRecord,
        adminId,
        WithdrawRequestStatus.REJECTED,
        reason,
      );
    }
  },

  async markPaid(requestId: string, adminId: string, referenceNote: string): Promise<void> {
    const requestRecord = await prisma.$transaction(async (tx) => {
      const requestRecord = await withdrawRepository.findById(requestId, tx);
      if (!requestRecord) {
        throw new AppError("NOT_FOUND", "Withdraw request not found.", HTTP_STATUS.NOT_FOUND);
      }
      if (requestRecord.status !== WithdrawRequestStatus.APPROVED) {
        throw new AppError(
          "INVALID_TRANSITION",
          "Only approved requests can be marked paid.",
          HTTP_STATUS.CONFLICT,
        );
      }

      const claimedRows = await claimLedgerRows(tx, requestRecord);
      if (!claimedRows) {
        throw new AppError(
          "INSUFFICIENT_LEDGER_ROWS",
          "Couldn't find enough available ledger rows to cover this amount — reject or adjust instead.",
          HTTP_STATUS.CONFLICT,
        );
      }

      await withdrawRepository.createLedgerEntries(tx, requestId, claimedRows);

      const paid = await withdrawRepository.markPaid(requestId, adminId, referenceNote, tx);
      if (!paid) {
        throw new AppError(
          "INVALID_TRANSITION",
          "This request can no longer be marked paid.",
          HTTP_STATUS.CONFLICT,
        );
      }

      return requestRecord;
    });

    await publishWithdrawRequestStatusChanged(requestRecord, adminId, WithdrawRequestStatus.PAID);
  },
};

const withKind = <Row extends { id: string; amount: number; createdAt: Date }>(
  rows: Row[],
  kind: LedgerRowKind,
): LedgerRow[] => rows.map(({ id, amount, createdAt }) => ({ id, amount, createdAt, kind }));

const listAvailableLedgerRows = async (
  tx: Prisma.TransactionClient,
  { ownerType, creatorId, brandId }: WithdrawRequestRecord,
): Promise<LedgerRow[] | null> => {
  if (ownerType === "CREATOR" && creatorId) {
    const [commissionRows, offerPayoutRows] = await Promise.all([
      commissionRepository.listAvailableForCreator(tx, creatorId),
      outfitOfferRepository.listAvailablePayoutsForCreator(tx, creatorId),
    ]);
    return [
      ...withKind(commissionRows, LEDGER_ROW_KIND.COMMISSION),
      ...withKind(offerPayoutRows, LEDGER_ROW_KIND.OFFER_PAYOUT),
    ];
  }
  if (ownerType === "BUSINESS" && brandId) {
    const [payoutRows, buildCommissionRows] = await Promise.all([
      brandPayoutRepository.listAvailableForBrand(tx, brandId),
      commissionRepository.listAvailableForBrand(tx, brandId),
    ]);
    return [
      ...withKind(payoutRows, LEDGER_ROW_KIND.BRAND_PAYOUT),
      ...withKind(buildCommissionRows, LEDGER_ROW_KIND.COMMISSION),
    ];
  }
  return null;
};

const claimLedgerRows = async (
  tx: Prisma.TransactionClient,
  requestRecord: WithdrawRequestRecord,
): Promise<ClaimedLedgerRows | null> => {
  const availableRows = await listAvailableLedgerRows(tx, requestRecord);
  if (!availableRows) return null;
  const pickedRows = pickOldestRowsCoveringAmount(availableRows, requestRecord.amount);
  if (!pickedRows) return null;

  const claimedRows: ClaimedLedgerRows = {
    brandPayoutIds: idsOfKind(pickedRows, LEDGER_ROW_KIND.BRAND_PAYOUT),
    creatorCommissionIds: idsOfKind(pickedRows, LEDGER_ROW_KIND.COMMISSION),
    outfitOfferIds: idsOfKind(pickedRows, LEDGER_ROW_KIND.OFFER_PAYOUT),
  };
  const { brandPayoutIds, creatorCommissionIds, outfitOfferIds } = claimedRows;
  const [withdrawnPayoutCount, paidCommissionCount, paidOfferCount] = await Promise.all([
    brandPayoutRepository.markAvailableAsWithdrawn(tx, brandPayoutIds),
    commissionRepository.markAvailableAsPaid(tx, creatorCommissionIds),
    outfitOfferRepository.markPayoutsPaid(tx, outfitOfferIds),
  ]);
  const isEveryRowClaimed =
    withdrawnPayoutCount === brandPayoutIds.length &&
    paidCommissionCount === creatorCommissionIds.length &&
    paidOfferCount === outfitOfferIds.length;
  return isEveryRowClaimed ? claimedRows : null;
};
