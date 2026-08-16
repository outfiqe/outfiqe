import logger from "#lib/winston.utils.js";

import { RETURN_WINDOW_MS } from "./commission.constants.js";
import { commissionRepository } from "./commission.repository.js";

const VOID_REASON_CANCELLED = "order cancelled";
const VOID_REASON_PAYMENT_FAILED = "payment failed or refunded";

const settleIds = async (
  ids: string[],
  settle: (id: string) => Promise<boolean>,
): Promise<number> => {
  let count = 0;
  for (const id of ids) {
    try {
      if (await settle(id)) count += 1;
    } catch (error) {
      logger.error(`Commission lifecycle update failed for ${id}: ${String(error)}`);
    }
  }
  return count;
};

export const runCommissionLifecycleSweep = async (): Promise<{
  approved: number;
  voided: number;
}> => {
  const deliveredBefore = new Date(Date.now() - RETURN_WINDOW_MS);

  const approvableIds = await commissionRepository.findApprovableIds(deliveredBefore);
  const approved = await settleIds(approvableIds, commissionRepository.approve);

  const cancelledIds = await commissionRepository.findVoidableForCancelledIds();
  const voidedCancelled = await settleIds(cancelledIds, (id) =>
    commissionRepository.void(id, VOID_REASON_CANCELLED),
  );

  const failedPaymentIds = await commissionRepository.findVoidableForFailedPaymentIds();
  const voidedFailed = await settleIds(failedPaymentIds, (id) =>
    commissionRepository.void(id, VOID_REASON_PAYMENT_FAILED),
  );

  return { approved, voided: voidedCancelled + voidedFailed };
};
