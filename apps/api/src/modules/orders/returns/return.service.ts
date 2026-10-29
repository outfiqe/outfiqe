import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  FulfilmentStatus,
  InventoryMovementKind,
  InventoryMovementSource,
  OrderRefundCause,
} from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";
import { brandPayoutRepository } from "#modules/brand-payouts/brand-payout.repository.js";
import { commissionRepository } from "#modules/commissions/commission.repository.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";
import { productService } from "#modules/products/product.service.js";

import { orderFulfilmentGroupRepository } from "../fulfilment-groups/fulfilment-group.repository.js";
import { NOTHING_ALREADY_PAID, ORDER_AUDIT_TARGET_TYPE } from "../order.constants.js";
import { orderRepository } from "../order.repository.js";
import type { OrderReturnOutcome } from "../order.types.js";
import { listRemainingUnits } from "../refunds/refund.claim.js";
import {
  PAYMENT_STATUSES_WITH_MONEY_TAKEN,
  PAYMENT_STATUSES_WITH_NOTHING_TAKEN_YET,
} from "../refunds/refund.constants.js";
import { type AppliedRefund, orderRefundEngine } from "../refunds/refund.engine.js";
import { REFUND_SETTLEMENT, type RefundSettlement } from "../refunds/refund.payment.js";
import { listUnrefundedStockLines } from "../refunds/refund.pricing.js";
import { orderRefundRepository } from "../refunds/refund.repository.js";

const RETURNABLE_FULFILMENT_STATUSES: FulfilmentStatus[] = [
  FulfilmentStatus.SHIPPED,
  FulfilmentStatus.DELIVERED,
];

const NO_REMAINING_UNITS = 0;
const NO_HUB_GROUPS = 0;

const REFUNDED_BY_SETTLEMENT: Record<RefundSettlement, boolean | null> = {
  [REFUND_SETTLEMENT.PAID_BY_GATEWAY]: true,
  [REFUND_SETTLEMENT.NEEDS_MANUAL]: false,
  [REFUND_SETTLEMENT.CASH_NOT_COLLECTED]: null,
  [REFUND_SETTLEMENT.ALREADY_SETTLED]: null,
};

const refundReturnedUnits = async (
  tx: Prisma.TransactionClient,
  orderId: string,
  adminUserId: string,
  reason: string,
): Promise<AppliedRefund | null> => {
  const order = await orderRefundRepository.findOrderForRefund(tx, orderId);
  if (!order) return null;
  const hasMoneyPosition =
    PAYMENT_STATUSES_WITH_MONEY_TAKEN.has(order.paymentStatus) ||
    PAYMENT_STATUSES_WITH_NOTHING_TAKEN_YET.has(order.paymentStatus);
  const remainingUnits = listRemainingUnits(order);
  if (!hasMoneyPosition || remainingUnits.length === NO_REMAINING_UNITS) return null;

  return orderRefundEngine.claimAndApplyInTransaction(
    tx,
    {
      orderId,
      lineRequests: remainingUnits,
      cause: OrderRefundCause.RETURNED,
      reason,
      requestedById: adminUserId,
    },
    { restockUnits: false, actorUserId: adminUserId },
  );
};

export const orderReturnService = {
  async markReturned(
    orderId: string,
    adminUserId: string,
    reason: string,
  ): Promise<OrderReturnOutcome> {
    const order = await orderRepository.findForAdminAction(orderId);
    if (!order) throw new AppError("NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND);
    if (order.fulfilmentGroups.length > NO_HUB_GROUPS) {
      throw new AppError(
        "RETURN_CHECKED_IN_AT_HUB",
        "This order was delivered through the Outfiqe hub. Check the parcel in at the hub when it comes back instead.",
        HTTP_STATUS.CONFLICT,
      );
    }
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
      await productService.restoreStockForItems(tx, listUnrefundedStockLines(order.items), {
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
      const appliedRefund = await refundReturnedUnits(tx, orderId, adminUserId, reason);

      return {
        appliedRefund,
        counts: {
          voidedCommissionCount,
          voidedPayoutCount,
          paidCommissionCount,
          withdrawnPayoutCount,
          needsClawback: paidCommissionCount + withdrawnPayoutCount > NOTHING_ALREADY_PAID,
        },
      };
    });

    if (!settlementOutcome) {
      throw new AppError(
        "INVALID_TRANSITION",
        "This order's status changed — refresh and try again.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const { appliedRefund, counts } = settlementOutcome;
    const settlement = appliedRefund
      ? await orderRefundEngine.finishAfterCommit(appliedRefund)
      : null;
    const returnOutcome: OrderReturnOutcome = {
      ...counts,
      refunded: settlement ? REFUNDED_BY_SETTLEMENT[settlement] : null,
    };

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
