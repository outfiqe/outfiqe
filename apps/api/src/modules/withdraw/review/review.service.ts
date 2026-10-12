import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import type { Prisma } from "#generated/prisma/client.js";
import { WithdrawRequestStatus } from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { bankAccountRepository } from "#modules/bank-accounts/bank-account.repository.js";
import { brandBankAccountRepository } from "#modules/brand-bank-accounts/brand-bank-account.repository.js";
import { brandPayoutRepository } from "#modules/brand-payouts/brand-payout.repository.js";
import { commissionRepository } from "#modules/commissions/commission.repository.js";
import { outfitOfferRepository } from "#modules/outfit-offers/outfit-offer.repository.js";

import { LEDGER_ROW_KIND } from "../withdraw.constants.js";
import { withdrawRepository } from "../withdraw.repository.js";
import type {
  ApproveWithdrawRequestBody,
  ListAdminWithdrawRequestsQuery,
} from "../withdraw.schemas.js";
import type {
  AdminWithdrawRequestView,
  ClaimedLedgerRows,
  LedgerRow,
  LedgerRowKind,
  WithdrawRequestRecord,
} from "../withdraw.types.js";
import {
  idsOfKind,
  pickOldestRowsCoveringAmount,
  toAdminWithdrawRequestView,
} from "../withdraw.utils.js";

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

export const withdrawReviewService = {
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
