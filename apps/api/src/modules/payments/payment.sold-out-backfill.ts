import { prisma } from "#db/prisma.js";
import {
  FulfilmentStatus,
  OrderRefundCause,
  PaymentMethod,
  PaymentStatus,
} from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { listRemainingUnits } from "#modules/orders/refunds/refund.claim.js";
import { orderRefundEngine } from "#modules/orders/refunds/refund.engine.js";
import { orderRefundRepository } from "#modules/orders/refunds/refund.repository.js";
import { describeError } from "#redis/redis.utils.js";

import { SOLD_OUT_AT_PAYMENT_REASON } from "./payment.constants.js";

const BACKFILL_BATCH_SIZE = 100;
const NOTHING_LEFT = 0;

export type SoldOutRefundBackfillSummary = {
  scanned: number;
  refunded: number;
  failed: number;
};

const findOrdersMissingRefund = (afterOrderId: string | null) =>
  prisma.order.findMany({
    where: {
      paymentStatus: PaymentStatus.PAID,
      fulfilmentStatus: FulfilmentStatus.CANCELLED,
      needsManualRefund: true,
      paymentMethod: { not: PaymentMethod.COD },
      refunds: { none: {} },
      ...(afterOrderId ? { id: { gt: afterOrderId } } : {}),
    },
    select: { id: true },
    orderBy: { id: "asc" },
    take: BACKFILL_BATCH_SIZE,
  });

const refundOrderIfUnrefunded = async (orderId: string) => {
  const appliedRefund = await prisma.$transaction(async (tx) => {
    const order = await orderRefundRepository.findOrderForRefund(tx, orderId);
    if (!order) return null;
    const remainingUnits = listRemainingUnits(order);
    if (remainingUnits.length === NOTHING_LEFT) return null;
    return orderRefundEngine.claimAndApplyInTransaction(
      tx,
      {
        orderId,
        lineRequests: remainingUnits,
        cause: OrderRefundCause.SOLD_OUT_AT_PAYMENT,
        reason: SOLD_OUT_AT_PAYMENT_REASON,
        requestedById: null,
      },
      { restockUnits: false, actorUserId: null },
    );
  });
  if (!appliedRefund) return false;
  await orderRefundEngine.finishAfterCommit(appliedRefund);
  return true;
};

export const refundSoldOutPaymentsMissingRefund =
  async (): Promise<SoldOutRefundBackfillSummary> => {
    const summary: SoldOutRefundBackfillSummary = { scanned: 0, refunded: 0, failed: 0 };
    let lastOrderId: string | null = null;

    for (;;) {
      const orders = await findOrdersMissingRefund(lastOrderId);
      if (orders.length === NOTHING_LEFT) return summary;

      for (const { id: orderId } of orders) {
        summary.scanned += 1;
        lastOrderId = orderId;
        try {
          if (await refundOrderIfUnrefunded(orderId)) summary.refunded += 1;
        } catch (error) {
          summary.failed += 1;
          logger.error(
            `Sold-out payment backfill failed for order ${orderId}: ${describeError(error)}`,
          );
        }
      }
    }
  };
