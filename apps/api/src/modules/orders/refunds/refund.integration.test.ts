import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IDEMPOTENCY_HEADER } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  BrandPayoutStatus,
  CommissionStatus,
  CouponRedemptionStatus,
  FulfilmentMode,
  FulfilmentStatus,
  OrderRefundCause,
  OrderRefundMethod,
  OrderRefundStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionType,
  PickupStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import {
  createAdminSessionWithPlatformPermissions,
  createRoleLimitedStaffSession,
} from "#test/integration/auth-helpers.js";
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

const refundsPath = (orderId: string) => `/api/orders/admin/${orderId}/refunds`;
const REFUND_QUEUE_PATH = "/api/orders/admin/refunds";
const markPaidPath = (refundId: string) => `/api/orders/admin/refunds/${refundId}/mark-paid`;

const staffRefund = (
  authHeader: string,
  orderId: string,
  body: Record<string, unknown>,
  idempotencyKey: string = `refund-${randomUUID()}`,
) =>
  request(testApp)
    .post(refundsPath(orderId))
    .set("Authorization", authHeader)
    .set(IDEMPOTENCY_HEADER, idempotencyKey)
    .send({ cause: OrderRefundCause.STAFF_ADJUSTMENT, reason: "Damaged in the bag", ...body });

beforeEach(async () => {
  await redis.flushdb();
  khaltiRefund.mockReset();
  khaltiRefund.mockResolvedValue({ succeeded: true, rawResponse: { detail: "refunded" } });
});

describe("staff partial refunds", () => {
  it("refunds part of a Khalti order exactly and shrinks the brand's payout in proportion", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { order, items } = await createRefundableOrder({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.PAID,
      lines: [{ unitPrice: 1000, qty: 3, withCommission: true }],
    });
    const orderItemId = requireFixtureId(items[0]?.item.id);

    const response = await staffRefund(authHeader, order.id, {
      lines: [{ orderItemId, qty: 1 }],
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      status: OrderRefundStatus.SUCCEEDED,
      method: OrderRefundMethod.GATEWAY,
      goodsAmount: 1000,
      feeAmount: 0,
      totalAmount: 1000,
    });
    expect(khaltiRefund).toHaveBeenCalledWith(expect.objectContaining({ amount: 1000 }));

    const [refreshedOrder, payout, commission, item] = await Promise.all([
      prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
      prisma.brandPayout.findUniqueOrThrow({ where: { orderItemId } }),
      prisma.creatorCommission.findFirstOrThrow({ where: { orderItemId } }),
      prisma.orderItem.findUniqueOrThrow({ where: { id: orderItemId } }),
    ]);
    expect(refreshedOrder).toMatchObject({
      refundedAmount: 1000,
      paymentStatus: PaymentStatus.PARTIALLY_REFUNDED,
    });
    expect(item.refundedQty).toBe(1);
    expect(payout).toMatchObject({ grossAmount: 2000, platformFee: 200, netAmount: 1800 });
    expect(commission.status).toBe(CommissionStatus.PENDING);
    expect(
      await prisma.paymentTransaction.count({
        where: { orderId: order.id, type: PaymentTransactionType.REFUND, amount: 1000 },
      }),
    ).toBe(1);
  });

  it("cancels the commission and payout once every unit is refunded, and returns the fees", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { order, items } = await createRefundableOrder({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.PAID,
      lines: [{ unitPrice: 500, qty: 2, withCommission: true }],
    });
    const orderItemId = requireFixtureId(items[0]?.item.id);

    const response = await staffRefund(authHeader, order.id, {
      lines: [{ orderItemId, qty: 2 }],
    });

    expect(response.body.data).toMatchObject({
      goodsAmount: 1000,
      feeAmount: 100,
      totalAmount: 1100,
    });
    const [refreshedOrder, payout, commission, group] = await Promise.all([
      prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
      prisma.brandPayout.findUniqueOrThrow({ where: { orderItemId } }),
      prisma.creatorCommission.findFirstOrThrow({ where: { orderItemId } }),
      prisma.orderFulfilmentGroup.findUniqueOrThrow({
        where: { id: requireFixtureId(items[0]?.group.id) },
      }),
    ]);
    expect(refreshedOrder).toMatchObject({
      paymentStatus: PaymentStatus.REFUNDED,
      fulfilmentStatus: FulfilmentStatus.CANCELLED,
    });
    expect(payout.status).toBe(BrandPayoutStatus.VOIDED);
    expect(commission.status).toBe(CommissionStatus.VOIDED);
    expect(group.status).toBe(FulfilmentStatus.CANCELLED);
  });

  it("only lowers what the rider collects on a cash-on-delivery order", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { order, items } = await createRefundableOrder({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [
        { unitPrice: 800, qty: 1 },
        { unitPrice: 600, qty: 1 },
      ],
    });

    const response = await staffRefund(authHeader, order.id, {
      lines: [{ orderItemId: requireFixtureId(items[1]?.item.id), qty: 1 }],
    });

    expect(response.body.data).toMatchObject({
      status: OrderRefundStatus.SUCCEEDED,
      method: OrderRefundMethod.CASH_NOT_COLLECTED,
      totalAmount: 600,
    });
    expect(khaltiRefund).not.toHaveBeenCalled();
    const refreshedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(refreshedOrder).toMatchObject({ refundedAmount: 600, paymentStatus: PaymentStatus.DUE });
  });

  it("sends an eSewa refund to the manual queue until staff pay it", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      "platform:orders:manage",
      "platform:orders:read",
    );
    const { order, items } = await createRefundableOrder({
      paymentMethod: PaymentMethod.ESEWA,
      paymentStatus: PaymentStatus.PAID,
      lines: [{ unitPrice: 900, qty: 2 }],
    });

    const created = await staffRefund(authHeader, order.id, {
      lines: [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 }],
    });
    expect(created.body.data.status).toBe(OrderRefundStatus.NEEDS_MANUAL);
    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).needsManualRefund,
    ).toBe(true);

    const queue = await request(testApp).get(REFUND_QUEUE_PATH).set("Authorization", authHeader);
    expect(queue.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: created.body.data.id, orderId: order.id }),
      ]),
    );

    const paid = await request(testApp)
      .post(markPaidPath(created.body.data.id))
      .set("Authorization", authHeader)
      .send({ transferReference: "ESW-7781" });
    expect(paid.body.data).toMatchObject({
      status: OrderRefundStatus.SUCCEEDED,
      method: OrderRefundMethod.MANUAL_TRANSFER,
      transferReference: "ESW-7781",
    });
    const refreshedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(refreshedOrder).toMatchObject({
      needsManualRefund: false,
      paymentStatus: PaymentStatus.PARTIALLY_REFUNDED,
    });

    const paidAgain = await request(testApp)
      .post(markPaidPath(created.body.data.id))
      .set("Authorization", authHeader)
      .send({ transferReference: "ESW-7781" });
    expect(paidAgain.status).toBe(409);
  });

  it("moves a refund to the manual queue when Khalti refuses it", async () => {
    khaltiRefund.mockResolvedValue({ succeeded: false, rawResponse: { detail: "Too late" } });
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { order, items } = await createRefundableOrder({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.PAID,
      lines: [{ unitPrice: 700, qty: 2 }],
    });

    const response = await staffRefund(authHeader, order.id, {
      lines: [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 }],
    });

    expect(response.body.data.status).toBe(OrderRefundStatus.NEEDS_MANUAL);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe(
      PaymentStatus.PAID,
    );
  });
});

describe("refund safety", () => {
  it("refuses to refund units that were already refunded", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { order, items } = await createRefundableOrder({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 400, qty: 2 }],
    });
    const lines = [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 2 }];

    await staffRefund(authHeader, order.id, { lines });
    const again = await staffRefund(authHeader, order.id, { lines });

    expect(again.status).toBe(409);
    expect(again.body.code).toBe("REFUND_MORE_THAN_REMAINING");
  });

  it("replays a retried request instead of refunding twice", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { order, items } = await createRefundableOrder({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.PAID,
      lines: [{ unitPrice: 300, qty: 3 }],
    });
    const idempotencyKey = `refund-${randomUUID()}`;
    const body = { lines: [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 }] };

    const first = await staffRefund(authHeader, order.id, body, idempotencyKey);
    const retry = await staffRefund(authHeader, order.id, body, idempotencyKey);

    expect(retry.body.data.id).toBe(first.body.data.id);
    expect(khaltiRefund).toHaveBeenCalledTimes(1);
    expect(await prisma.orderRefund.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("lets only one of two simultaneous refunds of the same units through", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { order, items } = await createRefundableOrder({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 450, qty: 1 }],
    });
    const body = { lines: [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 }] };

    const responses = await Promise.all([
      staffRefund(authHeader, order.id, body),
      staffRefund(authHeader, order.id, body),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const { refundedAmount, total } = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(refundedAmount).toBe(total);
    expect(await prisma.orderRefund.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("is closed to staff who can only read orders", async () => {
    const reader = await createRoleLimitedStaffSession("platform:orders:read");
    const { order, items } = await createRefundableOrder({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 450, qty: 1 }],
    });
    const body = {
      lines: [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 }],
      cause: OrderRefundCause.STAFF_ADJUSTMENT,
      reason: "Damaged",
    };

    const response = await request(testApp)
      .post(refundsPath(order.id))
      .set("Authorization", reader.authHeader)
      .set(IDEMPOTENCY_HEADER, `refund-${randomUUID()}`)
      .send(body);

    expect(response.status).toBe(403);
    expect(await prisma.orderRefund.count({ where: { orderId: order.id } })).toBe(0);
  });
});

describe("refund side effects", () => {
  it("cancels a hub pickup the brand no longer needs to hand over", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { order, items } = await createRefundableOrder({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [
        { unitPrice: 500, qty: 1, fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS },
        { unitPrice: 700, qty: 1 },
      ],
    });

    await staffRefund(authHeader, order.id, {
      cause: OrderRefundCause.BRAND_UNAVAILABLE,
      lines: [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 }],
    });

    const hubGroup = await prisma.orderFulfilmentGroup.findUniqueOrThrow({
      where: { id: requireFixtureId(items[0]?.group.id) },
    });
    expect(hubGroup).toMatchObject({
      pickupStatus: PickupStatus.CANCELLED,
      status: FulfilmentStatus.CANCELLED,
    });
    const refreshedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(refreshedOrder.fulfilmentStatus).toBe(FulfilmentStatus.PLACED);
  });

  it("gives back the coupon budget for the refunded share when Outfiqe caused the refund", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { order, items, coupon } = await createRefundableOrder({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [
        { unitPrice: 1000, qty: 1, platformDiscountAmount: 100 },
        { unitPrice: 1000, qty: 1, platformDiscountAmount: 100 },
      ],
      coupon: { discountAmount: 200, platformFundedAmount: 200 },
    });

    await staffRefund(authHeader, order.id, {
      cause: OrderRefundCause.BRAND_UNAVAILABLE,
      lines: [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 }],
    });

    const [redemption, refreshedCoupon] = await Promise.all([
      prisma.couponRedemption.findUniqueOrThrow({ where: { orderId: order.id } }),
      prisma.coupon.findUniqueOrThrow({ where: { id: requireFixtureId(coupon?.id) } }),
    ]);
    expect(redemption).toMatchObject({
      releasedAmount: 100,
      status: CouponRedemptionStatus.CONSUMED,
    });
    expect(refreshedCoupon).toMatchObject({ spentAmount: 100, redemptionCount: 1 });
  });

  it("puts stock back only when asked to", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { order, items } = await createRefundableOrder({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 500, qty: 2 }],
    });
    const sizeId = requireFixtureId(items[0]?.size.id);
    const stockBefore = (await prisma.productSize.findUniqueOrThrow({ where: { id: sizeId } }))
      .stock;

    await staffRefund(authHeader, order.id, {
      restock: true,
      lines: [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 }],
    });

    expect((await prisma.productSize.findUniqueOrThrow({ where: { id: sizeId } })).stock).toBe(
      stockBefore + 1,
    );
  });
});

describe("customer view of refunds", () => {
  it("shows a customer their own refunds and hides other people's", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { order, items, buyer } = await createRefundableOrder({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 500, qty: 2 }],
    });
    await staffRefund(authHeader, order.id, {
      lines: [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 }],
    });
    const stranger = await createRefundableOrder({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 100, qty: 1 }],
    });

    const mine = await request(testApp)
      .get(`/api/orders/${order.id}/refunds`)
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER));
    const theirs = await request(testApp)
      .get(`/api/orders/${order.id}/refunds`)
      .set("Authorization", authHeaderFor(stranger.buyer.id, UserRole.CUSTOMER));

    expect(mine.body.data.refunds).toEqual([
      expect.objectContaining({ totalAmount: 500, lines: [expect.objectContaining({ qty: 1 })] }),
    ]);
    expect(theirs.status).toBe(404);
  });
});
