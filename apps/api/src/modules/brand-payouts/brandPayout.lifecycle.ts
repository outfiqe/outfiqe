import { RETURN_WINDOW_MS } from "#constants/settlement.constants.js";
import { settleIds } from "#lib/lifecycle-sweep.utils.js";

import { brandPayoutRepository } from "./brandPayout.repository.js";

const VOID_REASON_CANCELLED = "order cancelled";
const VOID_REASON_PAYMENT_FAILED = "payment failed or refunded";

const onSettleError = (id: string, error: unknown): string =>
  `Brand payout lifecycle update failed for ${id}: ${String(error)}`;

export const runBrandPayoutLifecycleSweep = async (): Promise<{
  approved: number;
  voided: number;
}> => {
  const deliveredBefore = new Date(Date.now() - RETURN_WINDOW_MS);

  const approvableIds = await brandPayoutRepository.findApprovableIds(deliveredBefore);
  const approved = await settleIds(approvableIds, brandPayoutRepository.approve, onSettleError);

  const cancelledIds = await brandPayoutRepository.findVoidableForCancelledIds();
  const voidedCancelled = await settleIds(
    cancelledIds,
    (id) => brandPayoutRepository.void(id, VOID_REASON_CANCELLED),
    onSettleError,
  );

  const failedPaymentIds = await brandPayoutRepository.findVoidableForFailedPaymentIds();
  const voidedFailed = await settleIds(
    failedPaymentIds,
    (id) => brandPayoutRepository.void(id, VOID_REASON_PAYMENT_FAILED),
    onSettleError,
  );

  return { approved, voided: voidedCancelled + voidedFailed };
};
