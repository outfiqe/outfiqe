import { env } from "#config/env.config.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { orderCancelledTemplate, refundFailedTemplate } from "#email-templates/order.templates.js";
import {
  CouponRedemptionStatus,
  FulfilmentStatus,
  InventoryMovementKind,
  InventoryMovementSource,
  OrderFulfilmentSummary,
  PaymentMethod,
  PaymentStatus,
} from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { brandPayoutRepository } from "#modules/brand-payouts/brand-payout.repository.js";
import { commissionRepository } from "#modules/commissions/commission.repository.js";
import { couponRepository } from "#modules/coupons/coupon.repository.js";
import { paymentRepository } from "#modules/payments/payment.repository.js";
import { paymentService } from "#modules/payments/payment.service.js";
import { productService } from "#modules/products/product.service.js";
import { userRepository } from "#modules/users/user.repository.js";

import { orderFulfilmentGroupRepository } from "../fulfilment-groups/fulfilment-group.repository.js";
import { orderRepository } from "../order.repository.js";
import type { CancelOrderActor } from "../order.types.js";

const CANCELLABLE_FULFILMENT_STATUSES: FulfilmentStatus[] = [
  FulfilmentStatus.PLACED,
  FulfilmentStatus.PACKED,
];

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

    const refundOutcome =
      order.paymentStatus === PaymentStatus.PAID
        ? await paymentService.refund(orderId, order.paymentMethod, order.phone)
        : null;

    const stockWasCommitted =
      order.paymentMethod === PaymentMethod.COD || order.paymentStatus === PaymentStatus.PAID;

    const cancelled = await prisma.$transaction(async (tx) => {
      const ok = await orderRepository.markCancelled(tx, orderId, CANCELLABLE_FULFILMENT_STATUSES);
      if (!ok) return false;

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
        await productService.restoreStockForItems(tx, order.items, {
          kind: InventoryMovementKind.ORDER_RESTORE,
          sourceType: InventoryMovementSource.ORDER,
          sourceId: orderId,
        });
      }
      await commissionRepository.voidForOrder(tx, orderId, reason);
      await brandPayoutRepository.voidForOrder(tx, orderId, reason);

      const redemption = await couponRepository.findRedemptionByOrderId(orderId, tx);
      if (redemption && redemption.status !== CouponRedemptionStatus.RELEASED) {
        if (actor.type === "ADMIN") {
          await couponRepository.markRedemptionReleased(
            tx,
            redemption.id,
            CouponRedemptionStatus.RELEASED,
            reason,
          );
          await couponRepository.releaseBudget(
            tx,
            redemption.couponId,
            redemption.platformFundedAmount,
          );
        }
      }

      if (refundOutcome) {
        await paymentRepository.recordRefund(
          tx,
          orderId,
          order.paymentMethod,
          refundOutcome.rawResponse,
        );
        if (refundOutcome.succeeded) {
          await orderRepository.markRefunded(tx, orderId);
        } else {
          await orderRepository.markNeedsManualRefund(tx, orderId);
        }
      }

      return true;
    });

    if (!cancelled) {
      throw new AppError(
        "INVALID_TRANSITION",
        "This order's status changed — refresh and try again.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const buyer = await userRepository.findById(order.userId);
    if (buyer) {
      const { subject, html } = orderCancelledTemplate({
        orderId,
        total: order.total,
        refunded: refundOutcome?.succeeded ?? false,
      });
      void sendEmail({
        to: buyer.email,
        subject,
        body: `Order ${orderId} has been cancelled.`,
        html,
      });
    }

    if (refundOutcome && !refundOutcome.succeeded) {
      const { subject, html } = refundFailedTemplate({ orderId, total: order.total });
      void sendEmail({
        to: env.OPS_NOTIFICATION_EMAIL,
        subject,
        body: `Order ${orderId} needs a manual refund — automatic refund failed.`,
        html,
      });
    }

    const actorDescription =
      actor.type === "ADMIN" ? `admin ${actor.adminUserId}` : `buyer ${actor.userId}`;
    logger.info(`Order ${orderId} cancelled by ${actorDescription}: ${reason}`);
  },
};
