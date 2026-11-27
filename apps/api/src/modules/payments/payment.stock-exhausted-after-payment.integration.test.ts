import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import { paymentSettledTemplate } from "#email-templates/order.templates.js";
import {
  BrandPayoutStatus,
  FulfilmentStatus,
  OrderFulfilmentSummary,
  OrderRefundCause,
  OrderRefundStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { requireFixtureId } from "#test/integration/logistics-fixtures.js";
import { authHeaderFor } from "#test/integration/order-fixtures.js";
import { createRefundableOrder } from "#test/integration/refund-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

const esewaVerify = vi.hoisted(() => vi.fn());
const sendEmailMock = vi.hoisted(() => vi.fn());
vi.mock("#lib/email.utils.js", () => ({ sendEmail: sendEmailMock }));

vi.mock("#modules/payments/providers/esewa.provider.js", () => ({
  esewaProvider: { initiate: vi.fn(), verify: esewaVerify },
}));

beforeEach(async () => {
  vi.clearAllMocks();
  sendEmailMock.mockReset();
  await redis.flushdb();
});

const readStock = async (sizeId: string): Promise<number> =>
  (await prisma.productSize.findUniqueOrThrow({ where: { id: sizeId } })).stock;

const createAwaitingEsewaOrder = async () => {
  const fixture = await createRefundableOrder({
    paymentMethod: PaymentMethod.ESEWA,
    paymentStatus: PaymentStatus.INITIATED,
    lines: [
      { unitPrice: 700, qty: 1 },
      { unitPrice: 300, qty: 2 },
    ],
  });
  await prisma.paymentTransaction.create({
    data: {
      orderId: fixture.order.id,
      provider: PaymentMethod.ESEWA,
      transactionRef: `esewa-${randomUUID()}`,
    },
  });
  return fixture;
};

describe("a paid order whose stock ran out before settlement", () => {
  it("refunds every unit through the refund engine and queues it for a manual payout", async () => {
    const { order, buyer, items } = await createAwaitingEsewaOrder();
    const stillAvailableSizeId = requireFixtureId(items[0]?.size.id);
    const soldOutSizeId = requireFixtureId(items[1]?.size.id);
    const stockBefore = await readStock(stillAvailableSizeId);
    await prisma.productSize.update({ where: { id: soldOutSizeId }, data: { stock: 0 } });
    esewaVerify.mockResolvedValue({ status: "COMPLETE", rawResponse: { status: "COMPLETE" } });

    const verification = await request(testApp)
      .post(`/api/payments/${order.id}/verify`)
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER));
    expect(verification.status).toBe(200);

    const reloaded = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { refunds: { include: { lines: true } }, items: true },
    });
    expect(reloaded.paymentStatus).toBe(PaymentStatus.PAID);
    expect(reloaded.fulfilmentStatus).toBe(FulfilmentStatus.CANCELLED);
    expect(reloaded.fulfilmentSummary).toBe(OrderFulfilmentSummary.CANCELLED);
    expect(reloaded.needsManualRefund).toBe(true);
    expect(reloaded.refundedAmount).toBe(order.total);
    expect(reloaded.items.every((item) => item.refundedQty === item.qty)).toBe(true);

    expect(reloaded.refunds).toHaveLength(1);
    const [refund] = reloaded.refunds;
    expect(refund?.cause).toBe(OrderRefundCause.SOLD_OUT_AT_PAYMENT);
    expect(refund?.status).toBe(OrderRefundStatus.NEEDS_MANUAL);
    expect(refund?.totalAmount).toBe(order.total);
    expect(refund?.lines).toHaveLength(items.length);

    const payouts = await prisma.brandPayout.findMany({
      where: { orderItem: { orderId: order.id } },
    });
    expect(payouts).toHaveLength(items.length);
    expect(payouts.every((payout) => payout.status === BrandPayoutStatus.VOIDED)).toBe(true);
    const groups = await prisma.orderFulfilmentGroup.findMany({ where: { orderId: order.id } });
    expect(groups.every((group) => group.status === FulfilmentStatus.CANCELLED)).toBe(true);
    expect(await readStock(stillAvailableSizeId)).toBe(stockBefore);
  });

  it("asks the shopper for refund details instead of announcing a received payment", async () => {
    const { order, buyer, items } = await createAwaitingEsewaOrder();
    await prisma.productSize.update({
      where: { id: requireFixtureId(items[1]?.size.id) },
      data: { stock: 0 },
    });
    esewaVerify.mockResolvedValue({ status: "COMPLETE", rawResponse: { status: "COMPLETE" } });

    await request(testApp)
      .post(`/api/payments/${order.id}/verify`)
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER));

    const { subject: paymentReceivedSubject } = paymentSettledTemplate({
      orderId: order.id,
      total: order.total,
    });
    const sentSubjects = sendEmailMock.mock.calls.map(([email]) => email.subject);
    expect(sentSubjects).not.toContain(paymentReceivedSubject);
    const emailRecipients = sendEmailMock.mock.calls.map(([email]) => email.to);
    expect(emailRecipients).toContain(buyer.email);
  });
});
