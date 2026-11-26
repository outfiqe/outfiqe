import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  BrandPayoutStatus,
  FulfilmentStatus,
  OrderRefundCause,
  OrderRefundStatus,
  PaymentMethod,
  PaymentStatus,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createRefundableOrder } from "#test/integration/refund-fixtures.js";

import { refundSoldOutPaymentsMissingRefund } from "./payment.sold-out-backfill.js";

const sendEmailMock = vi.hoisted(() => vi.fn());
vi.mock("#lib/email.utils.js", () => ({ sendEmail: sendEmailMock }));

beforeEach(async () => {
  await redis.flushdb();
  sendEmailMock.mockReset();
});

const createLegacySoldOutOrder = async () => {
  const fixture = await createRefundableOrder({
    paymentMethod: PaymentMethod.ESEWA,
    paymentStatus: PaymentStatus.PAID,
    lines: [
      { unitPrice: 700, qty: 1 },
      { unitPrice: 300, qty: 2 },
    ],
  });
  await prisma.order.update({
    where: { id: fixture.order.id },
    data: { fulfilmentStatus: FulfilmentStatus.CANCELLED, needsManualRefund: true },
  });
  return fixture;
};

describe("refunding sold-out payments that never got a refund", () => {
  it("creates the missing manual refund and cancels what the brand was told to ship", async () => {
    const { order, items } = await createLegacySoldOutOrder();

    const summary = await refundSoldOutPaymentsMissingRefund();

    expect(summary).toMatchObject({ refunded: 1, failed: 0 });
    const refunds = await prisma.orderRefund.findMany({ where: { orderId: order.id } });
    expect(refunds).toHaveLength(1);
    expect(refunds[0]).toMatchObject({
      cause: OrderRefundCause.SOLD_OUT_AT_PAYMENT,
      status: OrderRefundStatus.NEEDS_MANUAL,
      totalAmount: order.total,
    });
    const payouts = await prisma.brandPayout.findMany({
      where: { orderItem: { orderId: order.id } },
    });
    expect(payouts).toHaveLength(items.length);
    expect(payouts.every((payout) => payout.status === BrandPayoutStatus.VOIDED)).toBe(true);
    const groups = await prisma.orderFulfilmentGroup.findMany({ where: { orderId: order.id } });
    expect(groups.every((group) => group.status === FulfilmentStatus.CANCELLED)).toBe(true);
  });

  it("does nothing the second time it runs", async () => {
    const { order } = await createLegacySoldOutOrder();
    await refundSoldOutPaymentsMissingRefund();

    const secondRun = await refundSoldOutPaymentsMissingRefund();

    expect(secondRun).toEqual({ scanned: 0, refunded: 0, failed: 0 });
    expect(await prisma.orderRefund.count({ where: { orderId: order.id } })).toBe(1);
  });
});
