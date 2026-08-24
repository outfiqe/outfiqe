import { RETURN_WINDOW_MS } from "#constants/settlement.constants.js";
import { settleIds } from "#lib/lifecycle-sweep.utils.js";

import { commissionRepository } from "./commission.repository.js";

const VOID_REASON_CANCELLED = "order cancelled";
const VOID_REASON_PAYMENT_FAILED = "payment failed or refunded";

const onSettleError = (id: string, error: unknown): string =>
  `Commission lifecycle update failed for ${id}: ${String(error)}`;

export const runCommissionLifecycleSweep = async (): Promise<{
  approved: number;
  voided: number;
}> => {
  const deliveredBefore = new Date(Date.now() - RETURN_WINDOW_MS);

  const approvableIds = await commissionRepository.findApprovableIds(deliveredBefore);
  const approved = await settleIds(approvableIds, commissionRepository.approve, onSettleError);

  const cancelledIds = await commissionRepository.findVoidableForCancelledIds();
  const voidedCancelled = await settleIds(
    cancelledIds,
    (id) => commissionRepository.void(id, VOID_REASON_CANCELLED),
    onSettleError,
  );

  const failedPaymentIds = await commissionRepository.findVoidableForFailedPaymentIds();
  const voidedFailed = await settleIds(
    failedPaymentIds,
    (id) => commissionRepository.void(id, VOID_REASON_PAYMENT_FAILED),
    onSettleError,
  );

  return { approved, voided: voidedCancelled + voidedFailed };
};
