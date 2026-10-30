import logger from "#lib/winston.utils.js";

import { RECONCILE_CHECK_AFTER_MS, RECONCILE_EXPIRE_AFTER_MS } from "./payment.constants.js";
import { paymentRepository } from "./payment.repository.js";
import { reconcilePendingPayment } from "./payment.service.js";
import { PaymentVerifyStatus } from "./payment.types.js";

export const runPaymentReconciliationSweep = async (): Promise<{
  checked: number;
  settled: number;
  expired: number;
}> => {
  const now = Date.now();
  const checkAfter = new Date(now - RECONCILE_CHECK_AFTER_MS);
  const expireAfter = new Date(now - RECONCILE_EXPIRE_AFTER_MS);

  const pendingOrders = await paymentRepository.findOrdersToReconcile(checkAfter, expireAfter);

  let settled = 0;
  for (const order of pendingOrders) {
    try {
      const status = await reconcilePendingPayment(order);
      if (status === PaymentVerifyStatus.COMPLETE) settled += 1;
    } catch (error) {
      logger.error(`Reconciliation check failed for order ${order.id}: ${String(error)}`);
    }
  }

  const overdueOrders = await paymentRepository.findOrdersToExpire(expireAfter);
  let expired = 0;
  for (const order of overdueOrders) {
    try {
      const status = await reconcilePendingPayment(order);
      if (status === PaymentVerifyStatus.COMPLETE) {
        settled += 1;
        continue;
      }
      if (await paymentRepository.expireUnpaidOrder(order.id)) expired += 1;
    } catch (error) {
      logger.error(`Final payment check failed for overdue order ${order.id}: ${String(error)}`);
    }
  }

  return { checked: pendingOrders.length + overdueOrders.length, settled, expired };
};
