import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { orderCancelledTemplate } from "#email-templates/order.templates.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  FulfilmentStatus,
  InventoryMovementKind,
  InventoryMovementSource,
  OrderFulfilmentSummary,
  OrderRefundCause,
  PaymentMethod,
  PaymentStatus,
} from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { brandPayoutRepository } from "#modules/brand-payouts/brand-payout.repository.js";
import { commissionRepository } from "#modules/commissions/commission.repository.js";
import { paymentRepository } from "#modules/payments/payment.repository.js";
import { productService } from "#modules/products/product.service.js";
import { userRepository } from "#modules/users/user.repository.js";

import { orderFulfilmentGroupRepository } from "../fulfilment-groups/fulfilment-group.repository.js";
import { orderRepository } from "../order.repository.js";
import type { CancelOrderActor } from "../order.types.js";
import { listRemainingUnits } from "../refunds/refund.claim.js";
import {
  PAYMENT_STATUSES_WITH_MONEY_TAKEN,
  PAYMENT_STATUSES_WITH_NOTHING_TAKEN_YET,
} from "../refunds/refund.constants.js";
import { type AppliedRefund, orderRefundEngine } from "../refunds/refund.engine.js";
import { REFUND_SETTLEMENT } from "../refunds/refund.payment.js";
import { listUnrefundedStockLines } from "../refunds/refund.pricing.js";
import { orderRefundRepository } from "../refunds/refund.repository.js";

const CANCELLABLE_FULFILMENT_STATUSES: FulfilmentStatus[] = [
  FulfilmentStatus.PLACED,
  FulfilmentStatus.PACKED,
];

const NO_REFUND = null;
const NO_REMAINING_UNITS = 0;

const refundCauseFor = (actor: CancelOrderActor): OrderRefundCause =>
  actor.type === "BUYER" ? OrderRefundCause.CUSTOMER_CANCELLED : OrderRefundCause.STAFF_ADJUSTMENT;

const actorUserIdOf = (actor: CancelOrderActor): string =>
  actor.type === "ADMIN" ? actor.adminUserId : actor.userId;

const refundRemainingUnits = async (
  tx: Prisma.TransactionClient,
  orderId: string,
  actor: CancelOrderActor,
  reason: string,
): Promise<AppliedRefund | null> => {
  const order = await orderRefundRepository.findOrderForRefund(tx, orderId);
  if (!order) return NO_REFUND;
  const hasMoneyPosition =
    PAYMENT_STATUSES_WITH_MONEY_TAKEN.has(order.paymentStatus) ||
    PAYMENT_STATUSES_WITH_NOTHING_TAKEN_YET.has(order.paymentStatus);
  const remainingUnits = listRemainingUnits(order);
  if (!hasMoneyPosition || remainingUnits.length === NO_REMAINING_UNITS) return NO_REFUND;

  return orderRefundEngine.claimAndApplyInTransaction(
    tx,
    {
      orderId,
      lineRequests: remainingUnits,
      cause: refundCauseFor(actor),
      reason,
      requestedById: actorUserIdOf(actor),
    },
    { restockUnits: false, actorUserId: actorUserIdOf(actor) },
  );
};

type OrderForCancellation = NonNullable<
  Awaited<ReturnType<typeof orderRepository.findForAdminAction>>
>;

const settleCancellationInTransaction = async (
  tx: Prisma.TransactionClient,
  {
    order,
    orderId,
    actor,
    reason,
    stockWasCommitted,
  }: {
    order: OrderForCancellation;
    orderId: string;
    actor: CancelOrderActor;
    reason: string;
    stockWasCommitted: boolean;
  },
) => {
  const isMarked = await orderRepository.markCancelled(
    tx,
    orderId,
    CANCELLABLE_FULFILMENT_STATUSES,
  );
  if (!isMarked) return null;

  await orderFulfilmentGroupRepository.cancelFulfilmentGroupsForOrder(tx, orderId, new Date());
  await orderFulfilmentGroupRepository.setOrderFulfilmentRollup(tx, orderId, {
    fulfilmentStatus: FulfilmentStatus.CANCELLED,
    fulfilmentSummary: OrderFulfilmentSummary.CANCELLED,
  });

  if (order.paymentStatus === PaymentStatus.INITIATED) {
    await orderRepository.failUnsettledPayment(tx, orderId);
    await paymentRepository.failPendingTransactions(tx, orderId);
  }

  if (stockWasCommitted) {
    await productService.restoreStockForItems(tx, listUnrefundedStockLines(order.items), {
      kind: InventoryMovementKind.ORDER_RESTORE,
      sourceType: InventoryMovementSource.ORDER,
      sourceId: orderId,
    });
  }
  await commissionRepository.voidForOrder(tx, orderId, reason);
  await brandPayoutRepository.voidForOrder(tx, orderId, reason);

  return { appliedRefund: await refundRemainingUnits(tx, orderId, actor, reason) };
};

const emailBuyerAboutCancellation = async (
  { userId, total }: OrderForCancellation,
  orderId: string,
  wasRefunded: boolean,
): Promise<void> => {
  const buyer = await userRepository.findById(userId);
  if (!buyer) return;

  const { subject, html } = orderCancelledTemplate({ orderId, total, refunded: wasRefunded });
  void sendEmail({
    to: buyer.email,
    subject,
    body: `Order ${orderId} has been cancelled.`,
    html,
  });
};

export const orderCancellationService = {
  async cancel(orderId: string, actor: CancelOrderActor, reason: string): Promise<void> {
    const order = await orderRepository.findForAdminAction(orderId);
    if (!order) throw new AppError("NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND);
    if (actor.type === "BUYER" && order.userId !== actor.userId) {
      throw new AppError("NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND);
    }
    if (!CANCELLABLE_FULFILMENT_STATUSES.includes(order.fulfilmentStatus)) {
      throw new AppError(
        "INVALID_TRANSITION",
        "Only orders that haven't shipped yet can be cancelled.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const stockWasCommitted =
      order.paymentMethod === PaymentMethod.COD || order.paymentStatus === PaymentStatus.PAID;

    const cancellation = await prisma.$transaction((tx) =>
      settleCancellationInTransaction(tx, { order, orderId, actor, reason, stockWasCommitted }),
    );

    if (!cancellation) {
      throw new AppError(
        "INVALID_TRANSITION",
        "This order's status changed — refresh and try again.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const settlement = cancellation.appliedRefund
      ? await orderRefundEngine.finishAfterCommit(cancellation.appliedRefund)
      : null;

    await emailBuyerAboutCancellation(
      order,
      orderId,
      settlement === REFUND_SETTLEMENT.PAID_BY_GATEWAY,
    );

    const actorDescription =
      actor.type === "ADMIN" ? `admin ${actor.adminUserId}` : `buyer ${actor.userId}`;
    logger.info(`Order ${orderId} cancelled by ${actorDescription}: ${reason}`);
  },
};
