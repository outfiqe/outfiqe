import { env } from "#config/env.config.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { refundFailedTemplate } from "#email-templates/templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import type { PaymentMethod } from "#generated/prisma/enums.js";
import {
  FulfilmentStatus,
  InventoryMovementKind,
  InventoryMovementSource,
  PaymentStatus,
} from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { brandPayoutRepository } from "#modules/brand-payouts/brand-payout.repository.js";
import { commissionRepository } from "#modules/commissions/commission.repository.js";
import { paymentRepository } from "#modules/payments/payment.repository.js";
import { paymentService } from "#modules/payments/payment.service.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";
import { productService } from "#modules/products/product.service.js";
import { describeError } from "#redis/redis.utils.js";

import { orderFulfilmentGroupRepository } from "../fulfilment-groups/fulfilment-group.repository.js";
import { NOTHING_ALREADY_PAID, ORDER_AUDIT_TARGET_TYPE } from "../order.constants.js";
import { orderRepository } from "../order.repository.js";
import type { OrderReturnOutcome } from "../order.types.js";

const RETURNABLE_FULFILMENT_STATUSES: FulfilmentStatus[] = [
  FulfilmentStatus.SHIPPED,
  FulfilmentStatus.DELIVERED,
];

const alertOpsOfManualRefund = (orderId: string, total: number): void => {
  const { subject, html } = refundFailedTemplate({ orderId, total });
  void sendEmail({
    to: env.OPS_NOTIFICATION_EMAIL,
    subject,
    body: `Order ${orderId} needs a manual refund — automatic refund failed.`,
    html,
  });
};

const refundReturnedOrder = async (
  orderId: string,
  paymentMethod: PaymentMethod,
  payerPhone: string,
  total: number,
): Promise<boolean> => {
  try {
    const refundOutcome = await paymentService.refund(orderId, paymentMethod, payerPhone);
    await prisma.$transaction(async (tx) => {
      await paymentRepository.recordRefund(tx, orderId, paymentMethod, refundOutcome.rawResponse);
      if (refundOutcome.succeeded) {
        await orderRepository.markRefunded(tx, orderId);
      } else {
        await orderRepository.markNeedsManualRefund(tx, orderId);
      }
    });
    if (!refundOutcome.succeeded) alertOpsOfManualRefund(orderId, total);
    return refundOutcome.succeeded;
  } catch (error) {
    logger.error(`Refund for returned order ${orderId} failed: ${describeError(error)}`);
    await orderRepository.markNeedsManualRefund(prisma, orderId);
    alertOpsOfManualRefund(orderId, total);
    return false;
  }
};

export const orderReturnService = {
  async markReturned(
    orderId: string,
    adminUserId: string,
    reason: string,
  ): Promise<OrderReturnOutcome> {
    const order = await orderRepository.findForAdminAction(orderId);
    if (!order) throw new AppError("NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND);
    if (!RETURNABLE_FULFILMENT_STATUSES.includes(order.fulfilmentStatus)) {
      throw new AppError(
        "INVALID_TRANSITION",
        "Only orders that have shipped or been delivered can be marked as returned.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const returnedAt = new Date();

    const settlementOutcome = await prisma.$transaction(async (tx) => {
      const isMarked = await orderRepository.markReturned(
        tx,
        orderId,
        RETURNABLE_FULFILMENT_STATUSES,
        { returnedAt, returnReason: reason },
      );
      if (!isMarked) return null;

      await orderFulfilmentGroupRepository.returnFulfilmentGroupsForOrder(tx, orderId, returnedAt);
      await productService.restoreStockForItems(tx, order.items, {
        kind: InventoryMovementKind.ORDER_RESTORE,
        sourceType: InventoryMovementSource.ORDER,
        sourceId: orderId,
      });

      const [voidedCommissionCount, voidedPayoutCount] = await Promise.all([
        commissionRepository.voidForOrder(tx, orderId, reason),
        brandPayoutRepository.voidUnwithdrawnForOrder(tx, orderId, reason),
      ]);
      const [paidCommissionCount, withdrawnPayoutCount] = await Promise.all([
        commissionRepository.countPaidForOrder(tx, orderId),
        brandPayoutRepository.countWithdrawnForOrder(tx, orderId),
      ]);

      return {
        voidedCommissionCount,
        voidedPayoutCount,
        paidCommissionCount,
        withdrawnPayoutCount,
        needsClawback: paidCommissionCount + withdrawnPayoutCount > NOTHING_ALREADY_PAID,
      };
    });

    if (!settlementOutcome) {
      throw new AppError(
        "INVALID_TRANSITION",
        "This order's status changed — refresh and try again.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const refunded =
      order.paymentStatus === PaymentStatus.PAID
        ? await refundReturnedOrder(orderId, order.paymentMethod, order.phone, order.total)
        : null;
    const returnOutcome: OrderReturnOutcome = { ...settlementOutcome, refunded };

    await platformAudit.record({
      actorUserId: adminUserId,
      action: PLATFORM_AUDIT_ACTION.ORDER_RETURNED_TO_ORIGIN,
      summary: `Marked order ${orderId} as returned: ${reason}`,
      onBehalfOfUserId: order.userId,
      targetType: ORDER_AUDIT_TARGET_TYPE,
      targetId: orderId,
      metadata: { reason, fromStatus: order.fulfilmentStatus, ...returnOutcome },
    });

    await eventBus.publish(DomainEvents.ORDER_STATUS_CHANGED, {
      orderId,
      userId: order.userId,
      status: FulfilmentStatus.RETURNED,
    });

    return returnOutcome;
  },
};
