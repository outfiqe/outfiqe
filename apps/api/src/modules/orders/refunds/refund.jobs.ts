import { subDays } from "date-fns/subDays";
import { subMinutes } from "date-fns/subMinutes";

import logger from "#lib/winston.utils.js";

import { askCustomerForRefundDetails } from "./refund.payment.js";
import { orderRefundDestinationRepository } from "./refund-destination.repository.js";

const STALE_PENDING_REFUND_MINUTES = 15;
const REFUND_DETAILS_REMINDER_AFTER_DAYS = 3;
const REFUND_JOB_BATCH_SIZE = 100;
const NONE_MOVED = 0;

export const runStalePendingRefundSweep = async (): Promise<void> => {
  const movedRefundIds = await orderRefundDestinationRepository.moveStalePendingRefundsToManual(
    subMinutes(new Date(), STALE_PENDING_REFUND_MINUTES),
    REFUND_JOB_BATCH_SIZE,
  );
  if (movedRefundIds.length > NONE_MOVED) {
    logger.warn(
      `Moved ${movedRefundIds.length} refunds whose payment step never finished to the manual queue: ${movedRefundIds.join(", ")}`,
    );
  }
};

export const runRefundDetailsReminder = async (): Promise<void> => {
  const refundsAwaitingDetails = await orderRefundDestinationRepository.listRefundsAwaitingDetails({
    createdBefore: subDays(new Date(), REFUND_DETAILS_REMINDER_AFTER_DAYS),
    limit: REFUND_JOB_BATCH_SIZE,
  });
  for (const { id, orderId, totalAmount, order } of refundsAwaitingDetails) {
    const isFirstReminder = await orderRefundDestinationRepository.markDetailsReminderSent(id);
    if (!isFirstReminder) continue;
    askCustomerForRefundDetails({
      orderId,
      amount: totalAmount,
      customerEmail: order.user.email,
      isReminder: true,
    });
  }
};
