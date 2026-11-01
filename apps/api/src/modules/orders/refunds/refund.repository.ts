import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  BrandPayoutStatus,
  CommissionStatus,
  CouponRedemptionStatus,
  FulfilmentStatus,
  type OrderRefundCause,
  OrderRefundMethod,
  OrderRefundStatus,
  PaymentStatus,
} from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import type { PricedRefundLine } from "./refund.types.js";

const COUPON_RELEASE_SKIPPED = false;
const COUPON_RELEASE_APPLIED = true;

const OPEN_REFUND_STATUSES = [OrderRefundStatus.PENDING, OrderRefundStatus.NEEDS_MANUAL];
const UNWITHDRAWN_PAYOUT_STATUSES = [BrandPayoutStatus.PENDING, BrandPayoutStatus.AVAILABLE];
const UNPAID_COMMISSION_STATUSES = [
  CommissionStatus.PENDING,
  CommissionStatus.APPROVED,
  CommissionStatus.AVAILABLE,
];
const SINGLE_REDEMPTION = 1;

const orderForRefundSelect = {
  id: true,
  userId: true,
  phone: true,
  total: true,
  refundedAmount: true,
  deliveryFee: true,
  codFee: true,
  paymentMethod: true,
  paymentStatus: true,
  fulfilmentStatus: true,
  items: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      qty: true,
      refundedQty: true,
      unitPrice: true,
      platformDiscountAmount: true,
      sizeId: true,
      fulfilmentGroup: {
        select: { id: true, brandId: true, fulfilmentMode: true, status: true, pickupStatus: true },
      },
    },
  },
  couponRedemption: {
    select: {
      id: true,
      couponId: true,
      discountAmount: true,
      platformFundedAmount: true,
      releasedAmount: true,
      status: true,
      coupon: { select: { minSubtotal: true } },
    },
  },
} satisfies Prisma.OrderSelect;

export type OrderForRefund = Prisma.OrderGetPayload<{ select: typeof orderForRefundSelect }>;

const refundViewInclude = {
  lines: {
    select: {
      orderItemId: true,
      qty: true,
      amount: true,
      orderItem: {
        select: { product: { select: { name: true } }, size: { select: { label: true } } },
      },
    },
  },
} satisfies Prisma.OrderRefundInclude;

export type OrderRefundRecord = Prisma.OrderRefundGetPayload<{
  include: typeof refundViewInclude;
}>;

const refundQueueInclude = {
  ...refundViewInclude,
  order: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      paymentMethod: true,
      refundDestination: {
        select: {
          kind: true,
          walletId: true,
          accountName: true,
          accountNumberLast4: true,
          bank: { select: { name: true } },
          updatedAt: true,
        },
      },
    },
  },
} satisfies Prisma.OrderRefundInclude;

export type RefundQueueRecord = Prisma.OrderRefundGetPayload<{
  include: typeof refundQueueInclude;
}>;

export const orderRefundRepository = {
  async findOrderForRefund(client: DbClient, orderId: string): Promise<OrderForRefund | null> {
    return client.order.findUnique({ where: { id: orderId }, select: orderForRefundSelect });
  },

  async claimItemUnits(
    client: DbClient,
    claim: { orderItemId: string; refundedQtyBefore: number; qty: number },
  ): Promise<boolean> {
    const { count } = await client.orderItem.updateMany({
      where: { id: claim.orderItemId, refundedQty: claim.refundedQtyBefore },
      data: { refundedQty: { increment: claim.qty } },
    });
    return count > 0;
  },

  async addOrderRefundedAmount(
    client: DbClient,
    claim: { orderId: string; refundedAmountBefore: number; amount: number },
  ): Promise<boolean> {
    const { count } = await client.order.updateMany({
      where: { id: claim.orderId, refundedAmount: claim.refundedAmountBefore },
      data: { refundedAmount: { increment: claim.amount } },
    });
    return count > 0;
  },

  async createRefund(
    client: DbClient,
    refund: {
      orderId: string;
      cause: OrderRefundCause;
      reason: string;
      requestedById: string | null;
      goodsAmount: number;
      feeAmount: number;
      totalAmount: number;
      lines: PricedRefundLine[];
    },
  ): Promise<{ id: string }> {
    const { lines, ...refundFields } = refund;
    return client.orderRefund.create({
      data: { ...refundFields, lines: { createMany: { data: lines } } },
      select: { id: true },
    });
  },

  async settleRefund(
    client: DbClient,
    refundId: string,
    settlement: {
      method: OrderRefundMethod;
      gatewayResponse?: Prisma.InputJsonValue;
      paidById?: string;
      transferReference?: string;
    },
  ): Promise<boolean> {
    const { count } = await client.orderRefund.updateMany({
      where: { id: refundId, status: { in: OPEN_REFUND_STATUSES } },
      data: { ...settlement, status: OrderRefundStatus.SUCCEEDED, settledAt: new Date() },
    });
    return count > 0;
  },

  async markRefundNeedsManual(
    client: DbClient,
    refundId: string,
    gatewayResponse?: Prisma.InputJsonValue,
  ): Promise<boolean> {
    const { count } = await client.orderRefund.updateMany({
      where: { id: refundId, status: OrderRefundStatus.PENDING },
      data: {
        status: OrderRefundStatus.NEEDS_MANUAL,
        ...(gatewayResponse ? { gatewayResponse } : {}),
      },
    });
    return count > 0;
  },

  async findRefund(client: DbClient, refundId: string) {
    return client.orderRefund.findUnique({
      where: { id: refundId },
      select: {
        id: true,
        orderId: true,
        status: true,
        totalAmount: true,
        cause: true,
        order: {
          select: {
            userId: true,
            phone: true,
            paymentMethod: true,
            paymentStatus: true,
            total: true,
            user: { select: { email: true } },
            refundDestination: { select: { id: true } },
          },
        },
      },
    });
  },

  async listRefundQueue(params: {
    status: OrderRefundStatus;
    cursor?: string;
    limit: number;
  }): Promise<RefundQueueRecord[]> {
    return prisma.orderRefund.findMany({
      where: { status: params.status },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: refundQueueInclude,
    });
  },

  async findRefundRecord(refundId: string): Promise<OrderRefundRecord | null> {
    return prisma.orderRefund.findUnique({ where: { id: refundId }, include: refundViewInclude });
  },

  async listRefundsForOrder(orderId: string): Promise<OrderRefundRecord[]> {
    return prisma.orderRefund.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
      include: refundViewInclude,
    });
  },

  async sumSettledMoneyBack(client: DbClient, orderId: string): Promise<number> {
    const { _sum } = await client.orderRefund.aggregate({
      where: {
        orderId,
        status: OrderRefundStatus.SUCCEEDED,
        method: { in: [OrderRefundMethod.GATEWAY, OrderRefundMethod.MANUAL_TRANSFER] },
      },
      _sum: { totalAmount: true },
    });
    return _sum.totalAmount ?? 0;
  },

  async countOpenManualRefunds(client: DbClient, orderId: string): Promise<number> {
    return client.orderRefund.count({
      where: { orderId, status: { in: OPEN_REFUND_STATUSES } },
    });
  },

  async setOrderPaymentStatusAfterRefund(
    client: DbClient,
    orderId: string,
    paymentStatus: PaymentStatus,
  ): Promise<void> {
    await client.order.updateMany({
      where: {
        id: orderId,
        paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] },
      },
      data: { paymentStatus },
    });
  },

  async setOrderNeedsManualRefund(
    client: DbClient,
    orderId: string,
    needsManualRefund: boolean,
  ): Promise<void> {
    await client.order.update({ where: { id: orderId }, data: { needsManualRefund } });
  },

  async findPayoutForItem(client: DbClient, orderItemId: string) {
    return client.brandPayout.findUnique({
      where: { orderItemId },
      select: {
        id: true,
        status: true,
        gatewayFee: true,
        platformCommissionTierId: true,
        commissionRule: { select: { tiers: { orderBy: { sortOrder: "asc" } } } },
      },
    });
  },

  async resizePayout(
    client: DbClient,
    payoutId: string,
    amounts: { grossAmount: number; platformFee: number; gatewayFee: number; netAmount: number },
  ): Promise<boolean> {
    const { count } = await client.brandPayout.updateMany({
      where: { id: payoutId, status: { in: UNWITHDRAWN_PAYOUT_STATUSES } },
      data: amounts,
    });
    return count > 0;
  },

  async voidPayoutForItem(client: DbClient, orderItemId: string, voidedReason: string) {
    const { count } = await client.brandPayout.updateMany({
      where: { orderItemId, status: { in: UNWITHDRAWN_PAYOUT_STATUSES } },
      data: { status: BrandPayoutStatus.VOIDED, voidedReason },
    });
    return count;
  },

  async flagWithdrawnPayoutForClawback(client: DbClient, orderItemId: string): Promise<number> {
    const { count } = await client.brandPayout.updateMany({
      where: { orderItemId, status: BrandPayoutStatus.WITHDRAWN },
      data: { needsManualClawback: true },
    });
    return count;
  },

  async voidCommissionsForItem(
    client: DbClient,
    orderItemId: string,
    voidedReason: string,
  ): Promise<number> {
    const { count } = await client.creatorCommission.updateMany({
      where: { orderItemId, status: { in: UNPAID_COMMISSION_STATUSES } },
      data: { status: CommissionStatus.VOIDED, voidedReason },
    });
    return count;
  },

  async countPaidCommissionsForItem(client: DbClient, orderItemId: string): Promise<number> {
    return client.creatorCommission.count({
      where: { orderItemId, status: CommissionStatus.PAID },
    });
  },

  async raiseCouponReleasedAmount(
    client: DbClient,
    release: {
      redemptionId: string;
      couponId: string;
      releasedBefore: number;
      releasedAfter: number;
    },
  ): Promise<boolean> {
    const { count } = await client.couponRedemption.updateMany({
      where: { id: release.redemptionId, releasedAmount: release.releasedBefore },
      data: { releasedAmount: release.releasedAfter },
    });
    if (count === 0) return COUPON_RELEASE_SKIPPED;
    await client.coupon.update({
      where: { id: release.couponId },
      data: { spentAmount: { decrement: release.releasedAfter - release.releasedBefore } },
    });
    return COUPON_RELEASE_APPLIED;
  },

  async releaseCouponRedemption(
    client: DbClient,
    release: { redemptionId: string; couponId: string; reason: string },
  ): Promise<void> {
    const { count } = await client.couponRedemption.updateMany({
      where: { id: release.redemptionId, status: { not: CouponRedemptionStatus.RELEASED } },
      data: {
        status: CouponRedemptionStatus.RELEASED,
        releasedAt: new Date(),
        releasedReason: release.reason,
      },
    });
    if (count === 0) return;
    await client.coupon.update({
      where: { id: release.couponId },
      data: { redemptionCount: { decrement: SINGLE_REDEMPTION } },
    });
  },

  async cancelBrandShippedGroups(
    client: DbClient,
    groupIds: string[],
    cancelledAt: Date,
  ): Promise<void> {
    await client.orderFulfilmentGroup.updateMany({
      where: {
        id: { in: groupIds },
        status: { in: [FulfilmentStatus.PLACED, FulfilmentStatus.PACKED] },
      },
      data: { status: FulfilmentStatus.CANCELLED, cancelledAt },
    });
  },

  async listGroupsWithEveryUnitRefunded(client: DbClient, groupIds: string[]) {
    return client.orderFulfilmentGroup.findMany({
      where: {
        id: { in: groupIds },
        items: { none: { refundedQty: { lt: prisma.orderItem.fields.qty } } },
      },
      select: { id: true, fulfilmentMode: true, status: true, pickupStatus: true },
    });
  },
};
