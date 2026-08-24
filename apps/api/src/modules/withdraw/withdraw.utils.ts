import type {
  AdminWithdrawRequestView,
  WithdrawPolicyRecord,
  WithdrawPolicyView,
  WithdrawRequestRecord,
  WithdrawRequestView,
} from "./withdraw.types.js";
import type { WithdrawWindowBounds } from "./withdraw.window.utils.js";

export const toWithdrawPolicyView = (
  policy: WithdrawPolicyRecord,
  window: WithdrawWindowBounds,
): WithdrawPolicyView => ({
  ownerType: policy.ownerType,
  minAmount: policy.minAmount,
  maxAmount: policy.maxAmount,
  windowType: policy.windowType,
  windowValue: policy.windowValue,
  maxAttemptsPerWindow: policy.maxAttemptsPerWindow,
  cooldownAfterRejectionDays: policy.cooldownAfterRejectionDays,
  processingNoteText: policy.processingNoteText,
  nextWindowOpensAt: window.nextWindowOpensAt.toISOString(),
});

export const toWithdrawRequestView = (request: WithdrawRequestRecord): WithdrawRequestView => ({
  id: request.id,
  ownerType: request.ownerType,
  amount: request.amount,
  status: request.status,
  rejectionReason: request.rejectionReason,
  referenceNote: request.referenceNote,
  requiresSecondSignOff: request.requiresSecondSignOff,
  createdAt: request.createdAt.toISOString(),
  reviewedAt: request.reviewedAt?.toISOString() ?? null,
  paidAt: request.paidAt?.toISOString() ?? null,
});

type AdminWithdrawRequestRow = WithdrawRequestRecord & {
  creator: { name: string } | null;
  brand: { name: string } | null;
  bankAccount: { accountNumberLast4: string } | null;
  brandBankAccount: { accountNumberLast4: string } | null;
};

export const toAdminWithdrawRequestView = (
  row: AdminWithdrawRequestRow,
): AdminWithdrawRequestView => ({
  ...toWithdrawRequestView(row),
  ownerName: row.creator?.name ?? row.brand?.name ?? "Unknown",
  bankAccountLast4:
    row.bankAccount?.accountNumberLast4 ?? row.brandBankAccount?.accountNumberLast4 ?? "----",
  firstApprovedById: row.firstApprovedById,
});
