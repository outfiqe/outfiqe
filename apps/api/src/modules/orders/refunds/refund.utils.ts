import type { Prisma } from "#generated/prisma/client.js";
import {
  type FulfilmentMode,
  type FulfilmentStatus,
  type OrderRefundCause,
  PaymentMethod,
  type PaymentStatus,
  type PickupStatus,
} from "#generated/prisma/enums.js";
import { toStoredJson } from "#lib/stored-json.utils.js";

import {
  CAUSES_ALLOWED_WHILE_CASH_PARCEL_ON_THE_WAY,
  FULFILMENT_MODES_COVERED_BY_OUTFIQE_BY_CAUSE,
  FULFILMENT_STATUSES_HANDED_OVER_BY_BRAND,
  FULFILMENT_STATUSES_ON_THE_WAY,
  PAYMENT_STATUSES_WITH_NOTHING_TAKEN_YET,
  PICKUP_STATUSES_HANDED_OVER_BY_BRAND,
} from "./refund.constants.js";
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

export const toStoredGatewayResponse = (rawResponse: unknown): Prisma.InputJsonValue =>
  toStoredJson(rawResponse, UNREADABLE_GATEWAY_RESPONSE);

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

export type RefundedItemFulfilment = {
  fulfilmentMode: FulfilmentMode;
  status: FulfilmentStatus;
  pickupStatus: PickupStatus | null;
};

const hasBrandHandedOverGoods = ({ status, pickupStatus }: RefundedItemFulfilment): boolean =>
  FULFILMENT_STATUSES_HANDED_OVER_BY_BRAND.has(status) ||
  (pickupStatus !== null && PICKUP_STATUSES_HANDED_OVER_BY_BRAND.has(pickupStatus));

export const isRefundCoveredByOutfiqe = ({
  cause,
  restockUnits,
  fulfilment,
}: {
  cause: OrderRefundCause;
  restockUnits: boolean;
  fulfilment: RefundedItemFulfilment | null;
}): boolean => {
  const coveredFulfilmentModes = FULFILMENT_MODES_COVERED_BY_OUTFIQE_BY_CAUSE[cause];
  return (
    coveredFulfilmentModes !== undefined &&
    !restockUnits &&
    fulfilment !== null &&
    coveredFulfilmentModes.has(fulfilment.fulfilmentMode) &&
    hasBrandHandedOverGoods(fulfilment)
  );
};

const isParcelOnTheWay = ({ status }: RefundedItemFulfilment): boolean =>
  FULFILMENT_STATUSES_ON_THE_WAY.has(status);

export const isRefundBlockedWhileCashParcelOnTheWay = ({
  cause,
  paymentMethod,
  paymentStatus,
  refundedItemFulfilments,
}: {
  cause: OrderRefundCause;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  refundedItemFulfilments: readonly (RefundedItemFulfilment | null)[];
}): boolean =>
  paymentMethod === PaymentMethod.COD &&
  PAYMENT_STATUSES_WITH_NOTHING_TAKEN_YET.has(paymentStatus) &&
  !CAUSES_ALLOWED_WHILE_CASH_PARCEL_ON_THE_WAY.has(cause) &&
  refundedItemFulfilments.some((fulfilment) => fulfilment !== null && isParcelOnTheWay(fulfilment));

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
