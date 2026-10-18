import type { Prisma } from "#generated/prisma/client.js";
import {
  BrandPayoutStatus,
  CouponRedemptionStatus,
  FulfilmentMode,
  InventoryMovementKind,
  InventoryMovementSource,
  PaymentMethod,
  TrackingEventCode,
  TrackingEventSource,
} from "#generated/prisma/enums.js";
import { computeTieredPlatformFee } from "#modules/brand-payouts/brand-payout.utils.js";
import { TRACKING_SUBJECT_KIND } from "#modules/logistics/tracking/tracking.constants.js";
import { logisticsTrackingService } from "#modules/logistics/tracking/tracking.service.js";
import type { RecordTrackingEventOutcome } from "#modules/logistics/tracking/tracking.types.js";
import { productService } from "#modules/products/product.service.js";

import { orderFulfilmentGroupRepository } from "../fulfilment-groups/fulfilment-group.repository.js";
import type { ClaimedRefund } from "./refund.claim.js";
import {
  CAUSES_RELEASING_COUPON_BUDGET,
  FULFILMENT_STATUSES_STILL_WITH_BRAND,
  PAYMENT_STATUSES_WITH_MONEY_TAKEN,
  PICKUP_STATUSES_STILL_WITH_BRAND,
} from "./refund.constants.js";
import { proportionalShare } from "./refund.pricing.js";
import { type OrderForRefund, orderRefundRepository } from "./refund.repository.js";
import { couponBudgetReleaseTarget, resizeBrandPayout } from "./refund.utils.js";

type TransactionClient = Prisma.TransactionClient;
type OrderItemForRefund = OrderForRefund["items"][number];

const NOTHING_KEPT = 0;
const NO_PLATFORM_FEE = 0;
const PICKUP_CANCELLED_DEDUPE_PREFIX = "refund-cancelled";

export type RefundLedgerOutcome = {
  voidedPayoutCount: number;
  withdrawnPayoutCount: number;
  voidedCommissionCount: number;
  paidCommissionCount: number;
  cancelledPickupOutcomes: RecordTrackingEventOutcome[];
};

export type RefundLedgerOptions = {
  restockUnits: boolean;
  actorUserId: string | null;
};

const fullLinePlatformFee = (
  item: OrderItemForRefund,
  payout: NonNullable<Awaited<ReturnType<typeof orderRefundRepository.findPayoutForItem>>>,
): number =>
  payout.platformCommissionTierId === null
    ? NO_PLATFORM_FEE
    : computeTieredPlatformFee(item.unitPrice * item.qty, payout.commissionRule.tiers).fee;

const settleItemPayout = async (
  tx: TransactionClient,
  item: OrderItemForRefund,
  keptQtyAfter: number,
  voidReason: string,
): Promise<Pick<RefundLedgerOutcome, "voidedPayoutCount" | "withdrawnPayoutCount">> => {
  const payout = await orderRefundRepository.findPayoutForItem(tx, item.id);
  if (!payout || payout.status === BrandPayoutStatus.VOIDED) {
    return { voidedPayoutCount: 0, withdrawnPayoutCount: 0 };
  }
  if (payout.status === BrandPayoutStatus.WITHDRAWN) {
    return {
      voidedPayoutCount: 0,
      withdrawnPayoutCount: await orderRefundRepository.flagWithdrawnPayoutForClawback(tx, item.id),
    };
  }
  if (keptQtyAfter === NOTHING_KEPT) {
    return {
      voidedPayoutCount: await orderRefundRepository.voidPayoutForItem(tx, item.id, voidReason),
      withdrawnPayoutCount: 0,
    };
  }
  await orderRefundRepository.resizePayout(
    tx,
    payout.id,
    resizeBrandPayout({
      unitPrice: item.unitPrice,
      qty: item.qty,
      keptQtyBefore: item.qty - item.refundedQty,
      keptQtyAfter,
      fullLinePlatformFee: fullLinePlatformFee(item, payout),
      currentGatewayFee: payout.gatewayFee,
    }),
  );
  return { voidedPayoutCount: 0, withdrawnPayoutCount: 0 };
};

const settleItemCommissions = async (
  tx: TransactionClient,
  item: OrderItemForRefund,
  keptQtyAfter: number,
  voidReason: string,
): Promise<Pick<RefundLedgerOutcome, "voidedCommissionCount" | "paidCommissionCount">> => {
  if (keptQtyAfter > NOTHING_KEPT) return { voidedCommissionCount: 0, paidCommissionCount: 0 };
  return {
    voidedCommissionCount: await orderRefundRepository.voidCommissionsForItem(
      tx,
      item.id,
      voidReason,
    ),
    paidCommissionCount: await orderRefundRepository.countPaidCommissionsForItem(tx, item.id),
  };
};

const releaseCouponBudget = async (tx: TransactionClient, claim: ClaimedRefund) => {
  const { order, pricing, cause, reason } = claim;
  const redemption = order.couponRedemption;
  const canRelease =
    redemption !== null &&
    redemption.status !== CouponRedemptionStatus.RELEASED &&
    CAUSES_RELEASING_COUPON_BUDGET.has(cause);
  if (!redemption || !canRelease) return;

  const refundedQtyAfter = new Map(order.items.map((item) => [item.id, item.refundedQty]));
  for (const line of pricing.lines) {
    refundedQtyAfter.set(
      line.orderItemId,
      (refundedQtyAfter.get(line.orderItemId) ?? 0) + line.qty,
    );
  }
  const refundedCouponDiscount = order.items.reduce(
    (sum, item) =>
      sum +
      proportionalShare(item.platformDiscountAmount, refundedQtyAfter.get(item.id) ?? 0, item.qty),
    0,
  );
  const releasedAfter = couponBudgetReleaseTarget({
    platformFundedAmount: redemption.platformFundedAmount,
    discountAmount: redemption.discountAmount,
    refundedCouponDiscount,
  });
  if (releasedAfter > redemption.releasedAmount) {
    await orderRefundRepository.raiseCouponReleasedAmount(tx, {
      redemptionId: redemption.id,
      couponId: redemption.couponId,
      releasedBefore: redemption.releasedAmount,
      releasedAfter,
    });
  }
  if (pricing.emptiesOrder) {
    await orderRefundRepository.releaseCouponRedemption(tx, {
      redemptionId: redemption.id,
      couponId: redemption.couponId,
      reason,
    });
  }
};

const restockRefundedUnits = async (
  tx: TransactionClient,
  claim: ClaimedRefund,
  itemsById: ReadonlyMap<string, OrderItemForRefund>,
) => {
  const { order, pricing, refundId } = claim;
  const wasStockCommitted =
    order.paymentMethod === PaymentMethod.COD ||
    PAYMENT_STATUSES_WITH_MONEY_TAKEN.has(order.paymentStatus);
  if (!wasStockCommitted) return;

  const restockLines = pricing.lines.flatMap(({ orderItemId, qty }) => {
    const item = itemsById.get(orderItemId);
    return item ? [{ sizeId: item.sizeId, qty }] : [];
  });
  await productService.restoreStockForItems(tx, restockLines, {
    kind: InventoryMovementKind.ORDER_RESTORE,
    sourceType: InventoryMovementSource.ORDER_REFUND,
    sourceId: refundId,
  });
};

const cancelEmptiedGroups = async (
  tx: TransactionClient,
  claim: ClaimedRefund,
  itemsById: ReadonlyMap<string, OrderItemForRefund>,
  actorUserId: string | null,
): Promise<RecordTrackingEventOutcome[]> => {
  const touchedGroupIds = [
    ...new Set(
      claim.pricing.lines.flatMap(({ orderItemId }) => {
        const groupId = itemsById.get(orderItemId)?.fulfilmentGroup?.id;
        return groupId ? [groupId] : [];
      }),
    ),
  ];
  const emptiedGroups = await orderRefundRepository.listGroupsWithEveryUnitRefunded(
    tx,
    touchedGroupIds,
  );

  const brandShippedGroupIds = emptiedGroups
    .filter(
      (group) =>
        group.fulfilmentMode === FulfilmentMode.BRAND_SHIPS &&
        FULFILMENT_STATUSES_STILL_WITH_BRAND.has(group.status),
    )
    .map((group) => group.id);
  await orderRefundRepository.cancelBrandShippedGroups(tx, brandShippedGroupIds, new Date());

  const cancelledPickupOutcomes: RecordTrackingEventOutcome[] = [];
  for (const group of emptiedGroups) {
    const isHubPickupStillWithBrand =
      group.fulfilmentMode === FulfilmentMode.OUTFIQE_LOGISTICS &&
      group.pickupStatus !== null &&
      PICKUP_STATUSES_STILL_WITH_BRAND.has(group.pickupStatus);
    if (!isHubPickupStillWithBrand) continue;
    cancelledPickupOutcomes.push(
      await logisticsTrackingService.recordEventInTransaction(tx, {
        subject: { kind: TRACKING_SUBJECT_KIND.PICKUP, fulfilmentGroupId: group.id },
        code: TrackingEventCode.CANCELLED,
        source: TrackingEventSource.SYSTEM,
        ...(actorUserId ? { actorUserId } : {}),
        dedupeKey: `${PICKUP_CANCELLED_DEDUPE_PREFIX}:${group.id}`,
        occurredAt: new Date(),
        note: "Every item for this brand was refunded",
      }),
    );
  }

  await orderFulfilmentGroupRepository.refreshOrderFulfilmentRollup(tx, claim.order.id);
  return cancelledPickupOutcomes;
};

export const applyRefundToLedgerInTransaction = async (
  tx: TransactionClient,
  claim: ClaimedRefund,
  { restockUnits, actorUserId }: RefundLedgerOptions,
): Promise<RefundLedgerOutcome> => {
  const itemsById = new Map(claim.order.items.map((item) => [item.id, item]));
  const voidReason = `Refunded: ${claim.reason}`;
  const outcome: RefundLedgerOutcome = {
    voidedPayoutCount: 0,
    withdrawnPayoutCount: 0,
    voidedCommissionCount: 0,
    paidCommissionCount: 0,
    cancelledPickupOutcomes: [],
  };

  for (const line of claim.pricing.lines) {
    const item = itemsById.get(line.orderItemId);
    if (!item) continue;
    const keptQtyAfter = item.qty - item.refundedQty - line.qty;
    const payoutOutcome = await settleItemPayout(tx, item, keptQtyAfter, voidReason);
    const commissionOutcome = await settleItemCommissions(tx, item, keptQtyAfter, voidReason);
    outcome.voidedPayoutCount += payoutOutcome.voidedPayoutCount;
    outcome.withdrawnPayoutCount += payoutOutcome.withdrawnPayoutCount;
    outcome.voidedCommissionCount += commissionOutcome.voidedCommissionCount;
    outcome.paidCommissionCount += commissionOutcome.paidCommissionCount;
  }

  await releaseCouponBudget(tx, claim);
  if (restockUnits) await restockRefundedUnits(tx, claim, itemsById);
  outcome.cancelledPickupOutcomes = await cancelEmptiedGroups(tx, claim, itemsById, actorUserId);
  return outcome;
};
