import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IDEMPOTENCY_HEADER } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  BrandUnavailableRequestStatus,
  FulfilmentStatus,
  OrderRefundCause,
  OrderRefundStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSessionWithPlatformPermissions } from "#test/integration/auth-helpers.js";
import {
  enableOrderLogisticsForBrands,
  requireFixtureId,
} from "#test/integration/logistics-fixtures.js";
import { authHeaderFor } from "#test/integration/order-fixtures.js";
import {
  createOwnerSessionForBrand,
  createRefundableOrder,
} from "#test/integration/refund-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

const sendEmailMock = vi.hoisted(() => vi.fn());
vi.mock("#lib/email.utils.js", () => ({ sendEmail: sendEmailMock }));

const COUPON_MINIMUM = 1500;

const createOrderWithItemChangesOn = async (input: Parameters<typeof createRefundableOrder>[0]) => {
  const refundableOrder = await createRefundableOrder(input);
  await enableOrderLogisticsForBrands(refundableOrder.items.map(({ group }) => group.brandId));
  return refundableOrder;
};

const cancelLines = (authHeader: string, orderId: string, lines: unknown[]) =>
  request(testApp)
    .post(`/api/orders/${orderId}/line-cancellations`)
    .set("Authorization", authHeader)
    .set(IDEMPOTENCY_HEADER, `cancel-${randomUUID()}`)
    .send({ lines });

beforeEach(async () => {
  await redis.flushdb();
  sendEmailMock.mockReset();
});

describe("customer item cancellation", () => {
  it("cancels one item, puts it back in stock and lowers what the rider collects", async () => {
    const { order, items, buyer } = await createOrderWithItemChangesOn({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [
        { unitPrice: 700, qty: 1 },
        { unitPrice: 300, qty: 2 },
      ],
    });
    const sizeId = requireFixtureId(items[1]?.size.id);
    const stockBefore = (await prisma.productSize.findUniqueOrThrow({ where: { id: sizeId } }))
      .stock;

    const response = await cancelLines(authHeaderFor(buyer.id, UserRole.CUSTOMER), order.id, [
      { orderItemId: requireFixtureId(items[1]?.item.id), qty: 1 },
    ]);

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      cause: OrderRefundCause.CUSTOMER_CANCELLED,
      status: OrderRefundStatus.SUCCEEDED,
      totalAmount: 300,
    });
    expect((await prisma.productSize.findUniqueOrThrow({ where: { id: sizeId } })).stock).toBe(
      stockBefore + 1,
    );
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).refundedAmount).toBe(
      300,
    );
  });

  it("refuses an item that has already shipped", async () => {
    const { order, items, buyer } = await createOrderWithItemChangesOn({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [
        { unitPrice: 700, qty: 1 },
        { unitPrice: 300, qty: 1 },
      ],
    });
    await prisma.orderFulfilmentGroup.update({
      where: { id: requireFixtureId(items[0]?.group.id) },
      data: { status: FulfilmentStatus.SHIPPED },
    });

    const response = await cancelLines(authHeaderFor(buyer.id, UserRole.CUSTOMER), order.id, [
      { orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 },
    ]);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("ITEM_ALREADY_ON_ITS_WAY");
  });

  it("won't drop a coupon order below the coupon's minimum spend", async () => {
    const { order, items, buyer, coupon } = await createOrderWithItemChangesOn({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [
        { unitPrice: 1000, qty: 1, platformDiscountAmount: 50 },
        { unitPrice: 1000, qty: 1, platformDiscountAmount: 50 },
      ],
      coupon: { discountAmount: 100, platformFundedAmount: 100 },
    });
    await prisma.coupon.update({
      where: { id: requireFixtureId(coupon?.id) },
      data: { minSubtotal: COUPON_MINIMUM },
    });

    const response = await cancelLines(authHeaderFor(buyer.id, UserRole.CUSTOMER), order.id, [
      { orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 },
    ]);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("COUPON_MINIMUM_NOT_MET");
  });

  it("hides someone else's order", async () => {
    const { order, items } = await createOrderWithItemChangesOn({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 700, qty: 1 }],
    });
    const stranger = await createOrderWithItemChangesOn({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 100, qty: 1 }],
    });

    const response = await cancelLines(
      authHeaderFor(stranger.buyer.id, UserRole.CUSTOMER),
      order.id,
      [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 }],
    );

    expect(response.status).toBe(404);
  });
});

describe("item changes before a brand is on Outfiqe delivery", () => {
  it("doesn't offer or allow cancelling single items", async () => {
    const { order, items, buyer } = await createRefundableOrder({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 700, qty: 2 }],
    });
    await enableOrderLogisticsForBrands([]);
    const authHeader = authHeaderFor(buyer.id, UserRole.CUSTOMER);

    const orderView = await request(testApp)
      .get(`/api/orders/${order.id}`)
      .set("Authorization", authHeader);
    expect(orderView.body.data.items[0]).toMatchObject({ canCancel: false });

    const response = await cancelLines(authHeader, order.id, [
      { orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 },
    ]);
    expect(response.status).toBe(409);
    expect(response.body.code).toBe("ITEM_CANCELLATION_NOT_AVAILABLE");
    expect(await prisma.orderRefund.count({ where: { orderId: order.id } })).toBe(0);
  });

  it("offers cancelling single items once the brand is switched on", async () => {
    const { order, buyer } = await createOrderWithItemChangesOn({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 700, qty: 2 }],
    });

    const orderView = await request(testApp)
      .get(`/api/orders/${order.id}`)
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER));

    expect(orderView.body.data.items[0]).toMatchObject({ canCancel: true, refundedQty: 0 });
  });

  it("doesn't let the brand report missing items", async () => {
    const { items } = await createRefundableOrder({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 900, qty: 1 }],
    });
    await enableOrderLogisticsForBrands([]);
    const group = requireFixtureId(items[0]?.group.id);
    const owner = await createOwnerSessionForBrand(requireFixtureId(items[0]?.group.brandId));

    const detail = await request(testApp)
      .get(`/api/orders/brand/fulfilment-groups/${group}`)
      .set("Authorization", owner.authHeader);
    expect(detail.body.data.canReportUnavailable).toBe(false);

    const reported = await request(testApp)
      .post(`/api/orders/brand/fulfilment-groups/${group}/unavailable-items`)
      .set("Authorization", owner.authHeader)
      .send({
        reason: "Out of stock",
        lines: [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 }],
      });
    expect(reported.status).toBe(409);
    expect(reported.body.code).toBe("UNAVAILABLE_REPORTS_NOT_AVAILABLE");
  });
});

describe("brand unavailable items", () => {
  it("lets a brand report an item, and refunds the customer when staff approve", async () => {
    const staff = await createAdminSessionWithPlatformPermissions(
      "platform:orders:manage",
      "platform:orders:read",
    );
    const { order, items } = await createOrderWithItemChangesOn({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 900, qty: 2 }],
    });
    const group = requireFixtureId(items[0]?.group.id);
    const brandId = (await prisma.orderFulfilmentGroup.findUniqueOrThrow({ where: { id: group } }))
      .brandId;
    const owner = await createOwnerSessionForBrand(brandId);

    const reported = await request(testApp)
      .post(`/api/orders/brand/fulfilment-groups/${group}/unavailable-items`)
      .set("Authorization", owner.authHeader)
      .send({
        reason: "Last one was damaged",
        lines: [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 }],
      });
    expect(reported.status).toBe(201);
    const requestId = requireFixtureId(reported.body.data.requests[0]?.id);

    const queue = await request(testApp)
      .get("/api/orders/admin/unavailable-items")
      .set("Authorization", staff.authHeader);
    expect(queue.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: requestId, qty: 1 })]),
    );

    const approved = await request(testApp)
      .post(`/api/orders/admin/unavailable-items/${requestId}/approve`)
      .set("Authorization", staff.authHeader);
    expect(approved.body.data).toMatchObject({
      status: BrandUnavailableRequestStatus.APPROVED,
      refundId: expect.any(String),
    });
    const refund = await prisma.orderRefund.findFirstOrThrow({ where: { orderId: order.id } });
    expect(refund).toMatchObject({ cause: OrderRefundCause.BRAND_UNAVAILABLE, totalAmount: 900 });

    const approvedAgain = await request(testApp)
      .post(`/api/orders/admin/unavailable-items/${requestId}/approve`)
      .set("Authorization", staff.authHeader);
    expect(approvedAgain.status).toBe(409);
  });

  it("allows only one open report per item, and lets staff reject it", async () => {
    const staff = await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    const { items } = await createOrderWithItemChangesOn({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 900, qty: 2 }],
    });
    const group = requireFixtureId(items[0]?.group.id);
    const brandId = (await prisma.orderFulfilmentGroup.findUniqueOrThrow({ where: { id: group } }))
      .brandId;
    const owner = await createOwnerSessionForBrand(brandId);
    const report = () =>
      request(testApp)
        .post(`/api/orders/brand/fulfilment-groups/${group}/unavailable-items`)
        .set("Authorization", owner.authHeader)
        .send({
          reason: "Out of stock",
          lines: [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 }],
        });

    const first = await report();
    const second = await report();
    expect(second.status).toBe(409);
    expect(second.body.code).toBe("UNAVAILABLE_REQUEST_ALREADY_OPEN");

    const rejected = await request(testApp)
      .post(`/api/orders/admin/unavailable-items/${first.body.data.requests[0]?.id}/reject`)
      .set("Authorization", staff.authHeader)
      .send({ note: "We found stock at the hub" });
    expect(rejected.body.data).toMatchObject({
      status: BrandUnavailableRequestStatus.REJECTED,
      decisionNote: "We found stock at the hub",
    });
  });

  it("hides another brand's order", async () => {
    const { items } = await createOrderWithItemChangesOn({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 900, qty: 1 }],
    });
    const otherBrand = await createOrderWithItemChangesOn({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 100, qty: 1 }],
    });
    const otherGroup = requireFixtureId(otherBrand.items[0]?.group.id);
    const otherBrandId = (
      await prisma.orderFulfilmentGroup.findUniqueOrThrow({ where: { id: otherGroup } })
    ).brandId;
    const otherOwner = await createOwnerSessionForBrand(otherBrandId);

    const response = await request(testApp)
      .post(
        `/api/orders/brand/fulfilment-groups/${requireFixtureId(items[0]?.group.id)}/unavailable-items`,
      )
      .set("Authorization", otherOwner.authHeader)
      .send({
        reason: "Out of stock",
        lines: [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 }],
      });

    expect(response.status).toBe(404);
  });
});
