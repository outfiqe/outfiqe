import { z } from "zod";

import type { Prisma } from "#generated/prisma/client.js";

import { proportionalShare } from "./refund.pricing.js";
import type { OrderRefundRecord, RefundQueueRecord } from "./refund.repository.js";
import type { OrderRefundView, RefundQueueItemView } from "./refund.types.js";

export const toRefundQueueItemView = (refund: RefundQueueRecord): RefundQueueItemView => {
  const { order } = refund;
  const destination = order.refundDestination;
  return {
    ...toOrderRefundView(refund),
    orderId: order.id,
    customerName: order.fullName,
    customerPhone: order.phone,
    paymentMethod: order.paymentMethod,
    destination: destination
      ? {
          kind: destination.kind,
          walletId: destination.walletId,
          bankName: destination.bank?.name ?? null,
          accountName: destination.accountName,
          accountNumberLast4: destination.accountNumberLast4,
          updatedAt: destination.updatedAt.toISOString(),
        }
      : null,
  };
};

export const toOrderRefundView = (refund: OrderRefundRecord): OrderRefundView => ({
  id: refund.id,
  cause: refund.cause,
  reason: refund.reason,
  status: refund.status,
  method: refund.method,
  goodsAmount: refund.goodsAmount,
  feeAmount: refund.feeAmount,
  totalAmount: refund.totalAmount,
  transferReference: refund.transferReference,
  createdAt: refund.createdAt.toISOString(),
  settledAt: refund.settledAt?.toISOString() ?? null,
  lines: refund.lines.map(({ orderItemId, qty, amount, orderItem }) => ({
    orderItemId,
    productName: orderItem.product.name,
    sizeLabel: orderItem.size.label,
    qty,
    amount,
  })),
});

const NOTHING = 0;
const UNREADABLE_GATEWAY_RESPONSE = { note: "The gateway's reply couldn't be stored." };

export const toStoredGatewayResponse = (rawResponse: unknown): Prisma.InputJsonValue => {
  const parsed = z.json().safeParse(rawResponse);
  return parsed.success && parsed.data !== null ? parsed.data : UNREADABLE_GATEWAY_RESPONSE;
};

export type ResizedBrandPayout = {
  grossAmount: number;
  platformFee: number;
  gatewayFee: number;
  netAmount: number;
};

export const resizeBrandPayout = ({
  unitPrice,
  qty,
  keptQtyBefore,
  keptQtyAfter,
  fullLinePlatformFee,
  currentGatewayFee,
}: {
  unitPrice: number;
  qty: number;
  keptQtyBefore: number;
  keptQtyAfter: number;
  fullLinePlatformFee: number;
  currentGatewayFee: number;
}): ResizedBrandPayout => {
  const grossAmount = unitPrice * keptQtyAfter;
  const platformFee = proportionalShare(fullLinePlatformFee, keptQtyAfter, qty);
  const gatewayFee =
    keptQtyBefore === NOTHING
      ? NOTHING
      : proportionalShare(currentGatewayFee, keptQtyAfter, keptQtyBefore);
  return { grossAmount, platformFee, gatewayFee, netAmount: grossAmount - platformFee };
};

export const couponBudgetReleaseTarget = ({
  platformFundedAmount,
  discountAmount,
  refundedCouponDiscount,
}: {
  platformFundedAmount: number;
  discountAmount: number;
  refundedCouponDiscount: number;
}): number =>
  discountAmount === NOTHING
    ? NOTHING
    : Math.min(
        platformFundedAmount,
        proportionalShare(platformFundedAmount, refundedCouponDiscount, discountAmount),
      );
