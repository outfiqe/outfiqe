import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IDEMPOTENCY_HEADER } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  OrderRefundCause,
  OrderRefundStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSessionWithPlatformPermissions } from "#test/integration/auth-helpers.js";
import { requireFixtureId } from "#test/integration/logistics-fixtures.js";
import { authHeaderFor } from "#test/integration/order-fixtures.js";
import { createRefundableOrder } from "#test/integration/refund-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

const khaltiRefund = vi.hoisted(() => vi.fn());

vi.mock("#modules/payments/providers/khalti.provider.js", () => ({
  khaltiProvider: { initiate: vi.fn(), verify: vi.fn(), refund: khaltiRefund },
  extractKhaltiTransactionId: (rawResponse: unknown) =>
    typeof rawResponse === "object" && rawResponse !== null && "transaction_id" in rawResponse
      ? String(rawResponse.transaction_id)
      : null,
}));

const staffRefund = (authHeader: string, orderId: string, lines: unknown) =>
  request(testApp)
    .post(`/api/orders/admin/${orderId}/refunds`)
    .set("Authorization", authHeader)
    .set(IDEMPOTENCY_HEADER, `refund-${randomUUID()}`)
    .send({ cause: OrderRefundCause.STAFF_ADJUSTMENT, reason: "Damaged in the bag", lines });

beforeEach(async () => {
  await redis.flushdb();
  khaltiRefund.mockReset();
  khaltiRefund.mockResolvedValue({ succeeded: true, rawResponse: { detail: "refunded" } });
});

describe("refund caps", () => {
  it("refuses an item that belongs to a different order", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const target = await createRefundableOrder({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.PAID,
      lines: [{ unitPrice: 500, qty: 1 }],
    });
    const other = await createRefundableOrder({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.PAID,
      lines: [{ unitPrice: 9000, qty: 1 }],
    });

    const response = await staffRefund(authHeader, target.order.id, [
      { orderItemId: requireFixtureId(other.items[0]?.item.id), qty: 1 },
    ]);

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(khaltiRefund).not.toHaveBeenCalled();
    expect(await prisma.orderRefund.count()).toBe(0);
  });

  it("refuses more units than were ordered", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { order, items } = await createRefundableOrder({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.PAID,
      lines: [{ unitPrice: 500, qty: 2 }],
    });

    const response = await staffRefund(authHeader, order.id, [
      { orderItemId: requireFixtureId(items[0]?.item.id), qty: 3 },
    ]);

    expect(response.status).toBe(409);
    expect(khaltiRefund).not.toHaveBeenCalled();
  });

  it("does not send gateway money back for an online order that was never paid", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { order, items } = await createRefundableOrder({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.INITIATED,
      lines: [{ unitPrice: 500, qty: 1 }],
    });

    const response = await staffRefund(authHeader, order.id, [
      { orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 },
    ]);

    expect(khaltiRefund).not.toHaveBeenCalled();
    const reloaded = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(reloaded.refundedAmount).toBe(0);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("never refunds more than the buyer paid across unit-by-unit refunds", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { order, items } = await createRefundableOrder({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.PAID,
      lines: [
        { unitPrice: 333, qty: 3 },
        { unitPrice: 101, qty: 1 },
      ],
      coupon: { discountAmount: 50, platformFundedAmount: 50 },
    });
    const firstLineId = requireFixtureId(items[0]?.item.id);
    const secondLineId = requireFixtureId(items[1]?.item.id);

    for (const orderItemId of [firstLineId, firstLineId, firstLineId, secondLineId]) {
      await staffRefund(authHeader, order.id, [{ orderItemId, qty: 1 }]);
    }

    const reloaded = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    const gatewayTotal = khaltiRefund.mock.calls.reduce(
      (sum, [call]) => sum + (call as { amount: number }).amount,
      0,
    );
    expect(reloaded.refundedAmount).toBeLessThanOrEqual(reloaded.total);
    expect(gatewayTotal).toBeLessThanOrEqual(reloaded.total);
  });

  it("refunds only the remainder when a paid order is cancelled after a partial refund", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { order, items, buyer } = await createRefundableOrder({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.PAID,
      lines: [{ unitPrice: 1000, qty: 3 }],
    });
    await staffRefund(authHeader, order.id, [
      { orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 },
    ]);

    const cancellation = await request(testApp)
      .post(`/api/orders/${order.id}/cancel`)
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER))
      .send({ reason: "Changed my mind" });

    const reloaded = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    const gatewayTotal = khaltiRefund.mock.calls.reduce(
      (sum, [call]) => sum + (call as { amount: number }).amount,
      0,
    );
    expect(cancellation.status).toBe(200);
    expect(gatewayTotal).toBeLessThanOrEqual(reloaded.total);
    expect(reloaded.refundedAmount).toBeLessThanOrEqual(reloaded.total);
  });

  it("queues a manual refund instead of failing when the gateway throws", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { order, items } = await createRefundableOrder({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.PAID,
      lines: [{ unitPrice: 800, qty: 1 }],
    });
    khaltiRefund.mockRejectedValue(new Error("gateway timeout"));

    const response = await staffRefund(authHeader, order.id, [
      { orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 },
    ]);

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe(OrderRefundStatus.NEEDS_MANUAL);
  });
});
