import {
  CouponRedemptionStatus,
  FulfilmentMode,
  type FulfilmentStatus,
  type PickupStatus,
} from "#generated/prisma/enums.js";

import {
  FULFILMENT_STATUSES_STILL_WITH_BRAND,
  PICKUP_STATUSES_STILL_WITH_BRAND,
} from "./refund.constants.js";
import type { OrderForRefund } from "./refund.repository.js";
import type { RefundPricing } from "./refund.types.js";

const NOTHING = 0;

export const LINE_CANCELLATION_PROBLEM = {
  ITEM_ALREADY_ON_ITS_WAY: "ITEM_ALREADY_ON_ITS_WAY",
  COUPON_MINIMUM_NOT_MET: "COUPON_MINIMUM_NOT_MET",
} as const;

export type LineCancellationProblem =
  (typeof LINE_CANCELLATION_PROBLEM)[keyof typeof LINE_CANCELLATION_PROBLEM];

type OrderItemForRefund = OrderForRefund["items"][number];

export const isGroupStillWithBrand = (group: {
  fulfilmentMode: FulfilmentMode;
  status: FulfilmentStatus;
  pickupStatus: PickupStatus | null;
}): boolean => {
  if (group.fulfilmentMode === FulfilmentMode.OUTFIQE_LOGISTICS) {
    return group.pickupStatus !== null && PICKUP_STATUSES_STILL_WITH_BRAND.has(group.pickupStatus);
  }
  return FULFILMENT_STATUSES_STILL_WITH_BRAND.has(group.status);
};

export const isItemStillWithBrand = ({ fulfilmentGroup }: OrderItemForRefund): boolean =>
  fulfilmentGroup !== null && isGroupStillWithBrand(fulfilmentGroup);

const keptSubtotalAfter = (order: OrderForRefund, pricing: RefundPricing): number => {
  const cancelledUnitsByItemId = new Map(pricing.lines.map((line) => [line.orderItemId, line.qty]));
  return order.items.reduce(
    (sum, item) =>
      sum +
      item.unitPrice *
        (item.qty - item.refundedQty - (cancelledUnitsByItemId.get(item.id) ?? NOTHING)),
    NOTHING,
  );
};

export const findLineCancellationProblem = (
  order: OrderForRefund,
  pricing: RefundPricing,
): LineCancellationProblem | null => {
  const itemsById = new Map(order.items.map((item) => [item.id, item]));
  const isEveryItemStillWithBrand = pricing.lines.every((line) => {
    const item = itemsById.get(line.orderItemId);
    return item !== undefined && isItemStillWithBrand(item);
  });
  if (!isEveryItemStillWithBrand) return LINE_CANCELLATION_PROBLEM.ITEM_ALREADY_ON_ITS_WAY;

  const redemption = order.couponRedemption;
  const keepsCouponActive =
    redemption !== null && redemption.status !== CouponRedemptionStatus.RELEASED;
  if (
    keepsCouponActive &&
    !pricing.emptiesOrder &&
    keptSubtotalAfter(order, pricing) < redemption.coupon.minSubtotal
  ) {
    return LINE_CANCELLATION_PROBLEM.COUPON_MINIMUM_NOT_MET;
  }
  return null;
};
