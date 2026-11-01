import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  FulfilmentStatus,
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

vi.mock("#modules/payments/providers/esewa.provider.js", () => ({
  esewaProvider: { initiate: vi.fn(), verify: esewaVerify },
}));

beforeEach(async () => {
  vi.clearAllMocks();
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
  it("flags a manual refund, cancels the order and leaves no units reserved", async () => {
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

    const reloaded = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(reloaded.paymentStatus).toBe(PaymentStatus.PAID);
    expect(reloaded.fulfilmentStatus).toBe(FulfilmentStatus.CANCELLED);
    expect(reloaded.needsManualRefund).toBe(true);
    expect(await readStock(stillAvailableSizeId)).toBe(stockBefore);
  });
});
