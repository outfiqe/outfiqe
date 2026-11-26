import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IDEMPOTENCY_HEADER } from "#constants/http.constants.js";
import {
  OrderRefundCause,
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

vi.mock("#lib/email.utils.js", () => ({ sendEmail: vi.fn() }));

const EMPTY_SUMMARY = {
  cancelledUnitCount: 0,
  causes: [],
  amountOffCashPayment: 0,
  amountRefunded: 0,
  amountComingBack: 0,
  amountAwaitingDetails: 0,
};

beforeEach(async () => {
  await redis.flushdb();
});

describe("shopper order refund summary", () => {
  it("is empty for an order nothing was cancelled on", async () => {
    const { order, buyer } = await createRefundableOrder({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 1000, qty: 1 }],
    });
    const buyerHeader = authHeaderFor(buyer.id, UserRole.CUSTOMER);

    const detail = await request(testApp)
      .get(`/api/orders/${order.id}`)
      .set("Authorization", buyerHeader);

    expect(detail.body.data.refundSummary).toEqual(EMPTY_SUMMARY);
  });

  it("flags a paid eSewa refund as waiting for the shopper's details on detail and list", async () => {
    const staff = await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { order, items, buyer } = await createRefundableOrder({
      paymentMethod: PaymentMethod.ESEWA,
      paymentStatus: PaymentStatus.PAID,
      lines: [{ unitPrice: 1200, qty: 2 }],
    });
    await request(testApp)
      .post(`/api/orders/admin/${order.id}/refunds`)
      .set("Authorization", staff.authHeader)
      .set(IDEMPOTENCY_HEADER, `refund-${randomUUID()}`)
      .send({
        cause: OrderRefundCause.STAFF_ADJUSTMENT,
        reason: "Sold out",
        lines: [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 }],
      });
    const buyerHeader = authHeaderFor(buyer.id, UserRole.CUSTOMER);

    const detail = await request(testApp)
      .get(`/api/orders/${order.id}`)
      .set("Authorization", buyerHeader);
    const list = await request(testApp).get("/api/orders").set("Authorization", buyerHeader);

    const expectedSummary = {
      cancelledUnitCount: 1,
      causes: [OrderRefundCause.STAFF_ADJUSTMENT],
      amountOffCashPayment: 0,
      amountRefunded: 0,
      amountComingBack: 1200,
      amountAwaitingDetails: 1200,
    };
    expect(detail.body.data.refundSummary).toEqual(expectedSummary);
    expect(list.body.data.orders[0].refundSummary).toEqual(expectedSummary);
  });

  it("stops asking for details once the shopper saved a refund destination", async () => {
    const staff = await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { order, items, buyer } = await createRefundableOrder({
      paymentMethod: PaymentMethod.ESEWA,
      paymentStatus: PaymentStatus.PAID,
      lines: [{ unitPrice: 1200, qty: 2 }],
    });
    await request(testApp)
      .post(`/api/orders/admin/${order.id}/refunds`)
      .set("Authorization", staff.authHeader)
      .set(IDEMPOTENCY_HEADER, `refund-${randomUUID()}`)
      .send({
        cause: OrderRefundCause.BRAND_UNAVAILABLE,
        reason: "Brand ran out",
        lines: [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 }],
      });
    const buyerHeader = authHeaderFor(buyer.id, UserRole.CUSTOMER);
    await request(testApp)
      .put(`/api/orders/${order.id}/refund-destination`)
      .set("Authorization", buyerHeader)
      .send({
        kind: "ESEWA",
        walletId: "9812345678",
        accountName: "Refund Buyer",
        confirmsOwnership: true,
      });

    const detail = await request(testApp)
      .get(`/api/orders/${order.id}`)
      .set("Authorization", buyerHeader);

    expect(detail.body.data.refundSummary).toMatchObject({
      amountComingBack: 1200,
      amountAwaitingDetails: 0,
    });
  });

  it("counts a cancelled cash-on-delivery item as money off what the shopper pays", async () => {
    const { order, items, buyer } = await createRefundableOrder({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 1000, qty: 2 }],
    });
    const buyerHeader = authHeaderFor(buyer.id, UserRole.CUSTOMER);
    await request(testApp)
      .post(`/api/orders/${order.id}/line-cancellations`)
      .set("Authorization", buyerHeader)
      .set(IDEMPOTENCY_HEADER, `cancel-${randomUUID()}`)
      .send({ lines: [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 }] });

    const detail = await request(testApp)
      .get(`/api/orders/${order.id}`)
      .set("Authorization", buyerHeader);

    expect(detail.body.data.refundSummary).toMatchObject({
      cancelledUnitCount: 1,
      causes: [OrderRefundCause.CUSTOMER_CANCELLED],
      amountOffCashPayment: 1000,
      amountRefunded: 0,
      amountComingBack: 0,
      amountAwaitingDetails: 0,
    });
  });
});
