import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { withIdempotency } from "#lib/idempotency.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import { ORDER_AUDIT_TARGET_TYPE } from "../order.constants.js";
import { orderNotFoundError } from "./refund.claim.js";
import { orderRefundEngine } from "./refund.engine.js";
import { markManualRefundPaid } from "./refund.payment.js";
import { type OrderForRefund, orderRefundRepository } from "./refund.repository.js";
import type {
  ListRefundQueueQuery,
  MarkManualRefundPaidBody,
  StaffRefundItemsBody,
} from "./refund.schemas.js";
import type { OrderRefundView, RefundPricing, RefundQueueItemView } from "./refund.types.js";
import {
  isRefundBlockedWhileCashParcelOnTheWay,
  toOrderRefundView,
  toRefundQueueItemView,
} from "./refund.utils.js";

const STAFF_REFUND_IDEMPOTENCY_ENDPOINT = "orders:staff-refund-items";

const refundNotFoundError = () =>
  new AppError("REFUND_NOT_FOUND", "Refund not found.", HTTP_STATUS.NOT_FOUND);

const requireRefundView = async (refundId: string): Promise<OrderRefundView> => {
  const refund = await orderRefundRepository.findRefundRecord(refundId);
  if (!refund) throw refundNotFoundError();
  return toOrderRefundView(refund);
};

const cashParcelOnTheWayError = () =>
  new AppError(
    "REFUND_WHILE_CASH_PARCEL_ON_THE_WAY",
    "This cash-on-delivery parcel is on its way to the shopper. Refund it now only if the delivery partner lost or damaged it. If the shopper refuses it, mark it returned once it's back. Anything else can wait until it's delivered.",
    HTTP_STATUS.CONFLICT,
  );

const assertStaffRefundAllowedWhileCashParcelOnTheWay = (
  cause: StaffRefundItemsBody["cause"],
  { paymentMethod, paymentStatus, items }: OrderForRefund,
  { lines }: RefundPricing,
) => {
  const refundedItemIds = new Set(lines.map(({ orderItemId }) => orderItemId));
  const refundedItemFulfilments = items
    .filter(({ id }) => refundedItemIds.has(id))
    .map(({ fulfilmentGroup }) => fulfilmentGroup);
  if (
    isRefundBlockedWhileCashParcelOnTheWay({
      cause,
      paymentMethod,
      paymentStatus,
      refundedItemFulfilments,
    })
  ) {
    throw cashParcelOnTheWayError();
  }
};

const refundItemsOnce = async (
  staffUserId: string,
  orderId: string,
  { lines, cause, reason, restock }: StaffRefundItemsBody,
): Promise<OrderRefundView> => {
  const appliedRefund = await prisma.$transaction((tx) =>
    orderRefundEngine.claimAndApplyInTransaction(
      tx,
      {
        orderId,
        lineRequests: lines,
        cause,
        reason,
        requestedById: staffUserId,
        checkBeforeClaim: (order, pricing) =>
          assertStaffRefundAllowedWhileCashParcelOnTheWay(cause, order, pricing),
      },
      { restockUnits: restock, actorUserId: staffUserId },
    ),
  );
  await orderRefundEngine.finishAfterCommit(appliedRefund);

  const { claim, ledger } = appliedRefund;
  await platformAudit.record({
    actorUserId: staffUserId,
    action: PLATFORM_AUDIT_ACTION.ORDER_ITEMS_REFUNDED,
    summary: `Refunded Rs. ${claim.pricing.totalAmount} on order ${orderId}: ${reason}`,
    onBehalfOfUserId: claim.order.userId,
    targetType: ORDER_AUDIT_TARGET_TYPE,
    targetId: orderId,
    metadata: {
      refundId: claim.refundId,
      cause,
      restock,
      lines,
      totalAmount: claim.pricing.totalAmount,
      paidCommissionCount: ledger.paidCommissionCount,
      withdrawnPayoutCount: ledger.withdrawnPayoutCount,
      outfiqeCoveredLineCount: ledger.outfiqeCoveredLineCount,
    },
  });
  return requireRefundView(claim.refundId);
};

export const orderRefundService = {
  refundOrderItems(
    staffUserId: string,
    orderId: string,
    body: StaffRefundItemsBody,
    idempotencyKey: string,
  ): Promise<OrderRefundView> {
    return withIdempotency(
      staffUserId,
      STAFF_REFUND_IDEMPOTENCY_ENDPOINT,
      idempotencyKey,
      () => refundItemsOnce(staffUserId, orderId, body),
      { orderId, ...body },
    );
  },

  async refundOrderItemsBySystem(
    orderId: string,
    { lines, cause, reason }: Omit<StaffRefundItemsBody, "restock">,
  ): Promise<OrderRefundView> {
    const appliedRefund = await prisma.$transaction((tx) =>
      orderRefundEngine.claimAndApplyInTransaction(
        tx,
        { orderId, lineRequests: lines, cause, reason, requestedById: null },
        { restockUnits: false, actorUserId: null },
      ),
    );
    await orderRefundEngine.finishAfterCommit(appliedRefund);
    return requireRefundView(appliedRefund.claim.refundId);
  },

  async listRefundQueue(
    query: ListRefundQueueQuery,
  ): Promise<{ items: RefundQueueItemView[]; nextCursor: string | null }> {
    const refunds = await orderRefundRepository.listRefundQueue(query);
    const { items, nextCursor } = buildCursorPage(refunds, query.limit, (refund) => refund.id);
    return { items: items.map(toRefundQueueItemView), nextCursor };
  },

  async listRefundsForOrder(orderId: string): Promise<OrderRefundView[]> {
    const refunds = await orderRefundRepository.listRefundsForOrder(orderId);
    return refunds.map(toOrderRefundView);
  },

  async listMyOrderRefunds(userId: string, orderId: string): Promise<OrderRefundView[]> {
    const order = await orderRefundRepository.findOrderForRefund(prisma, orderId);
    if (!order || order.userId !== userId) throw orderNotFoundError();
    const refunds = await orderRefundRepository.listRefundsForOrder(orderId);
    return refunds.map(toOrderRefundView);
  },

  async markManualRefundPaid(
    staffUserId: string,
    refundId: string,
    { transferReference }: MarkManualRefundPaidBody,
  ): Promise<OrderRefundView> {
    const refund = await orderRefundRepository.findRefund(prisma, refundId);
    if (!refund) throw refundNotFoundError();
    const isPaid = await markManualRefundPaid({
      refundId,
      paidById: staffUserId,
      transferReference,
    });
    if (!isPaid) {
      throw new AppError(
        "REFUND_NOT_AWAITING_MANUAL_PAYMENT",
        "This refund isn't waiting for a manual payment.",
        HTTP_STATUS.CONFLICT,
      );
    }

    await platformAudit.record({
      actorUserId: staffUserId,
      action: PLATFORM_AUDIT_ACTION.ORDER_MANUAL_REFUND_PAID,
      summary: `Paid manual refund of Rs. ${refund.totalAmount} on order ${refund.orderId}`,
      onBehalfOfUserId: refund.order.userId,
      targetType: ORDER_AUDIT_TARGET_TYPE,
      targetId: refund.orderId,
      metadata: { refundId, transferReference },
    });
    return requireRefundView(refundId);
  },
};
