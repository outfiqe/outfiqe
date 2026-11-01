import { HTTP_STATUS } from "#constants/http.constants.js";
import type { Prisma } from "#generated/prisma/client.js";
import type { OrderRefundCause } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";

import { orderErrors } from "../order.errors.js";
import {
  CAUSES_RETURNING_ORDER_FEES,
  PAYMENT_STATUSES_WITH_MONEY_TAKEN,
  PAYMENT_STATUSES_WITH_NOTHING_TAKEN_YET,
} from "./refund.constants.js";
import {
  priceRefund,
  REFUND_PRICING_PROBLEM,
  type RefundPricingProblem,
} from "./refund.pricing.js";
import { type OrderForRefund, orderRefundRepository } from "./refund.repository.js";
import type { RefundLineRequest, RefundPricing } from "./refund.types.js";

type TransactionClient = Prisma.TransactionClient;

const NO_UNITS_LEFT = 0;

export type RefundClaimInput = {
  orderId: string;
  lineRequests: RefundLineRequest[];
  cause: OrderRefundCause;
  reason: string;
  requestedById: string | null;
  checkBeforeClaim?: (order: OrderForRefund, pricing: RefundPricing) => void;
};

export type ClaimedRefund = {
  refundId: string;
  order: OrderForRefund;
  pricing: RefundPricing;
  cause: OrderRefundCause;
  reason: string;
};

const PRICING_PROBLEM_ERRORS: Record<RefundPricingProblem, () => AppError> = {
  [REFUND_PRICING_PROBLEM.UNKNOWN_ITEM]: () =>
    new AppError(
      "REFUND_ITEM_NOT_IN_ORDER",
      "That item isn't part of this order.",
      HTTP_STATUS.BAD_REQUEST,
    ),
  [REFUND_PRICING_PROBLEM.TOO_MANY_UNITS]: () =>
    new AppError(
      "REFUND_MORE_THAN_REMAINING",
      "Some of those items were already refunded. Refresh and try again.",
      HTTP_STATUS.CONFLICT,
    ),
  [REFUND_PRICING_PROBLEM.NO_UNITS]: () =>
    new AppError(
      "REFUND_NOTHING_SELECTED",
      "Choose at least one item to refund.",
      HTTP_STATUS.BAD_REQUEST,
    ),
};

const refundRaceError = () =>
  new AppError(
    "REFUND_CHANGED_MEANWHILE",
    "This order was refunded by someone else at the same time. Refresh and try again.",
    HTTP_STATUS.CONFLICT,
  );

export const orderNotFoundError = () => orderErrors.notFound();

const assertPaymentAllowsRefund = (order: OrderForRefund) => {
  const isSettled =
    PAYMENT_STATUSES_WITH_MONEY_TAKEN.has(order.paymentStatus) ||
    PAYMENT_STATUSES_WITH_NOTHING_TAKEN_YET.has(order.paymentStatus);
  if (!isSettled) {
    throw new AppError(
      "PAYMENT_NOT_SETTLED",
      "This order's payment hasn't settled, so it can't be partly refunded. Cancel the whole order instead.",
      HTTP_STATUS.CONFLICT,
    );
  }
};

const toRefundableItems = (order: OrderForRefund) =>
  order.items.map(({ id, qty, refundedQty, unitPrice, platformDiscountAmount }) => ({
    orderItemId: id,
    qty,
    refundedQty,
    unitPrice,
    platformDiscountAmount,
  }));

export const claimRefundInTransaction = async (
  tx: TransactionClient,
  { orderId, lineRequests, cause, reason, requestedById, checkBeforeClaim }: RefundClaimInput,
): Promise<ClaimedRefund> => {
  const order = await orderRefundRepository.findOrderForRefund(tx, orderId);
  if (!order) throw orderNotFoundError();
  assertPaymentAllowsRefund(order);

  const priced = priceRefund({
    items: toRefundableItems(order),
    lineRequests,
    orderFees: { deliveryFee: order.deliveryFee, codFee: order.codFee },
    refundsOrderFeesWhenEmptied:
      CAUSES_RETURNING_ORDER_FEES.has(cause) ||
      PAYMENT_STATUSES_WITH_NOTHING_TAKEN_YET.has(order.paymentStatus),
  });
  if ("problem" in priced) throw PRICING_PROBLEM_ERRORS[priced.problem]();
  const { pricing } = priced;
  checkBeforeClaim?.(order, pricing);

  const refundedQtyByItemId = new Map(order.items.map((item) => [item.id, item.refundedQty]));
  for (const line of pricing.lines) {
    const refundedQtyBefore = refundedQtyByItemId.get(line.orderItemId);
    if (refundedQtyBefore === undefined) throw refundRaceError();
    const isClaimed = await orderRefundRepository.claimItemUnits(tx, {
      orderItemId: line.orderItemId,
      refundedQtyBefore,
      qty: line.qty,
    });
    if (!isClaimed) throw refundRaceError();
  }

  const isAmountClaimed = await orderRefundRepository.addOrderRefundedAmount(tx, {
    orderId,
    refundedAmountBefore: order.refundedAmount,
    amount: pricing.totalAmount,
  });
  if (!isAmountClaimed) throw refundRaceError();

  const { id: refundId } = await orderRefundRepository.createRefund(tx, {
    orderId,
    cause,
    reason,
    requestedById,
    goodsAmount: pricing.goodsAmount,
    feeAmount: pricing.feeAmount,
    totalAmount: pricing.totalAmount,
    lines: pricing.lines,
  });

  return { refundId, order, pricing, cause, reason };
};

export const listRemainingUnits = (order: OrderForRefund): RefundLineRequest[] =>
  order.items
    .map(({ id, qty, refundedQty }) => ({ orderItemId: id, qty: qty - refundedQty }))
    .filter((line) => line.qty > NO_UNITS_LEFT);
