import type { Prisma } from "#generated/prisma/client.js";
import { logisticsTrackingService } from "#modules/logistics/tracking/tracking.service.js";

import {
  type ClaimedRefund,
  claimRefundInTransaction,
  type RefundClaimInput,
} from "./refund.claim.js";
import {
  applyRefundToLedgerInTransaction,
  type RefundLedgerOptions,
  type RefundLedgerOutcome,
} from "./refund.ledger.js";
import { type RefundSettlement, settleRefundPayment } from "./refund.payment.js";

export type AppliedRefund = { claim: ClaimedRefund; ledger: RefundLedgerOutcome };

export const orderRefundEngine = {
  async claimAndApplyInTransaction(
    tx: Prisma.TransactionClient,
    input: RefundClaimInput,
    options: RefundLedgerOptions,
  ): Promise<AppliedRefund> {
    const claim = await claimRefundInTransaction(tx, input);
    const ledger = await applyRefundToLedgerInTransaction(tx, claim, options);
    return { claim, ledger };
  },

  async finishAfterCommit({ claim, ledger }: AppliedRefund): Promise<RefundSettlement> {
    for (const pickupOutcome of ledger.cancelledPickupOutcomes) {
      await logisticsTrackingService.announceStageChange(pickupOutcome);
    }
    return settleRefundPayment(claim.refundId);
  },
};
