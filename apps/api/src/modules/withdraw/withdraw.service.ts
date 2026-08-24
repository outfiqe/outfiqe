import { env } from "#config/env.config.js";
import { prisma } from "#db/prisma.js";
import { withdrawRequestReceivedInternalTemplate } from "#email-templates/templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { Prisma } from "#generated/prisma/client.js";
import {
  BrandPayoutStatus,
  CommissionStatus,
  LedgerEntryKind,
  WithdrawRequestStatus,
} from "#generated/prisma/enums.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { sendEmail } from "#lib/email.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { isTransactionConflictError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { bankAccountRepository } from "#modules/bank-accounts/bankAccount.repository.js";
import { brandBankAccountRepository } from "#modules/brand-bank-accounts/brandBankAccount.repository.js";
import { brandPayoutRepository } from "#modules/brand-payouts/brandPayout.repository.js";
import { brandRepository } from "#modules/brands/brand.repository.js";
import { commissionRepository } from "#modules/commissions/commission.repository.js";
import { userRepository } from "#modules/users/user.repository.js";

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
  OwnerContext,
  WithdrawEligibilityView,
  WithdrawPolicyRecord,
  WithdrawPolicyView,
  WithdrawRequestRecord,
  WithdrawRequestView,
} from "./withdraw.types.js";
import {
  toAdminWithdrawRequestView,
  toWithdrawPolicyView,
  toWithdrawRequestView,
} from "./withdraw.utils.js";
import { computeWithdrawWindow } from "./withdraw.window.utils.js";

const BAD_REQUEST_STATUS = 400;
const NOT_FOUND_STATUS = 404;
const SERVICE_UNAVAILABLE_STATUS = 503;
const CONFLICT_STATUS = 409;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const resolveOwner = async (
  userId: string,
  ownerType: OwnerContext["ownerType"],
): Promise<OwnerContext> => {
  if (ownerType === "CREATOR") return { ownerType, creatorId: userId };
  const brandId = await requireBrandId(userId);
  return { ownerType, brandId };
};

const requirePolicy = async (
  ownerType: OwnerContext["ownerType"],
): Promise<WithdrawPolicyRecord> => {
  const policy = await withdrawRepository.findActivePolicy(ownerType);
  if (!policy) {
    throw new AppError(
      "WITHDRAW_POLICY_NOT_CONFIGURED",
      "Withdrawals aren't available right now. Please try again shortly.",
      SERVICE_UNAVAILABLE_STATUS,
    );
  }
  return policy;
};

const getAvailableLedgerBalance = async (owner: OwnerContext): Promise<number> => {
  if (owner.ownerType === "CREATOR") {
    const sums = await commissionRepository.sumByStatusForCreator(owner.creatorId);
    return sums[CommissionStatus.AVAILABLE] ?? 0;
  }
  const sums = await brandPayoutRepository.sumByStatusForBrand(owner.brandId);
  return sums[BrandPayoutStatus.AVAILABLE] ?? 0;
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
    return user?.name ?? "Unknown creator";
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
    const policy = await requirePolicy(ownerType);
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
    const policy = await requirePolicy(ownerType);
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
        BAD_REQUEST_STATUS,
      );
    }

    const ledgerAvailable = await getAvailableLedgerBalance(owner);

    try {
      const request = await prisma.$transaction(
        async (tx) => {
          const policy = await withdrawRepository.findActivePolicy(body.ownerType, tx);
          if (!policy) {
            throw new AppError(
              "WITHDRAW_POLICY_NOT_CONFIGURED",
              "Withdrawals aren't available right now. Please try again shortly.",
              SERVICE_UNAVAILABLE_STATUS,
            );
          }

          const window = computeWithdrawWindow(policy);
          if (!window.isOpen) {
            throw new AppError(
              "WINDOW_CLOSED",
              "The withdrawal window isn't open right now.",
              BAD_REQUEST_STATUS,
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
              BAD_REQUEST_STATUS,
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
                BAD_REQUEST_STATUS,
              );
            }
          }

          if (body.amount < policy.minAmount) {
            throw new AppError(
              "AMOUNT_TOO_LOW",
              `The minimum withdrawal amount is Rs. ${policy.minAmount}.`,
              BAD_REQUEST_STATUS,
            );
          }

          const isOverSoftCeiling = body.amount > policy.maxAmount;
          if (isOverSoftCeiling && body.ownerType === "CREATOR") {
            throw new AppError(
              "AMOUNT_TOO_HIGH",
              `The maximum withdrawal amount is Rs. ${policy.maxAmount}.`,
              BAD_REQUEST_STATUS,
            );
          }

          const reserved = await withdrawRepository.sumReservedAmount(owner, tx);
          const availableBalance = ledgerAvailable - reserved;
          if (body.amount > availableBalance) {
            throw new AppError(
              "INSUFFICIENT_BALANCE",
              "This amount exceeds your available balance.",
              BAD_REQUEST_STATUS,
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
        to: env.GMAIL_USER,
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
          CONFLICT_STATUS,
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
        throw new AppError("NOT_FOUND", "Withdraw request not found.", NOT_FOUND_STATUS);
      }

      if (
        requestRecord.requiresSecondSignOff &&
        requestRecord.firstApprovedById !== null &&
        requestRecord.firstApprovedById === adminId
      ) {
        throw new AppError(
          "SAME_ADMIN_SIGN_OFF",
          "A second sign-off must come from a different admin.",
          CONFLICT_STATUS,
        );
      }

      const isFinalApproval =
        !requestRecord.requiresSecondSignOff || requestRecord.firstApprovedById !== null;

      if (isFinalApproval) {
        const bankAccountId = requestRecord.bankAccountId ?? requestRecord.brandBankAccountId;
        if (!bankAccountId) {
          throw new AppError("NOT_FOUND", "This request has no bank account.", NOT_FOUND_STATUS);
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
            BAD_REQUEST_STATUS,
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
          CONFLICT_STATUS,
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
        CONFLICT_STATUS,
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
        throw new AppError("NOT_FOUND", "Withdraw request not found.", NOT_FOUND_STATUS);
      }
      if (requestRecord.status !== WithdrawRequestStatus.APPROVED) {
        throw new AppError(
          "INVALID_TRANSITION",
          "Only approved requests can be marked paid.",
          CONFLICT_STATUS,
        );
      }

      const claimedIds = await claimLedgerRows(tx, requestRecord);
      if (claimedIds.length === 0) {
        throw new AppError(
          "INSUFFICIENT_LEDGER_ROWS",
          "Couldn't find enough available ledger rows to cover this amount — reject or adjust instead.",
          CONFLICT_STATUS,
        );
      }

      await withdrawRepository.createLedgerEntries(
        tx,
        requestId,
        requestRecord.ownerType === "CREATOR"
          ? LedgerEntryKind.CREATOR_COMMISSION
          : LedgerEntryKind.BRAND_PAYOUT,
        claimedIds,
      );

      const paid = await withdrawRepository.markPaid(requestId, adminId, referenceNote, tx);
      if (!paid) {
        throw new AppError(
          "INVALID_TRANSITION",
          "This request can no longer be marked paid.",
          CONFLICT_STATUS,
        );
      }

      return requestRecord;
    });

    await publishWithdrawRequestStatusChanged(requestRecord, adminId, WithdrawRequestStatus.PAID);
  },
};

const claimLedgerRows = async (
  tx: Prisma.TransactionClient,
  requestRecord: WithdrawRequestRecord,
): Promise<string[]> => {
  if (requestRecord.ownerType === "CREATOR" && requestRecord.creatorId) {
    return commissionRepository.claimAvailableForCreator(
      tx,
      requestRecord.creatorId,
      requestRecord.amount,
    );
  }
  if (requestRecord.ownerType === "BUSINESS" && requestRecord.brandId) {
    return brandPayoutRepository.claimAvailableForBrand(
      tx,
      requestRecord.brandId,
      requestRecord.amount,
    );
  }
  return [];
};
