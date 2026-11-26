import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  BrandIncidentKind,
  FulfilmentStatus,
  OrderRefundCause,
  PaymentMethod,
  PaymentStatus,
} from "#generated/prisma/enums.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSessionWithPlatformPermissions } from "#test/integration/auth-helpers.js";
import { requireFixtureId } from "#test/integration/logistics-fixtures.js";
import {
  createOwnerSessionForBrand,
  createRefundableOrder,
} from "#test/integration/refund-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

const sendEmailMock = vi.hoisted(() => vi.fn());
vi.mock("#lib/email.utils.js", () => ({ sendEmail: sendEmailMock }));

const UNIT_PRICE = 900;
const ORDERED_QTY = 2;
const FIXTURE_DELIVERY_FEE = 100;
const CANCELLATION_REASON = "Ran out of stock before packing";

beforeEach(async () => {
  await redis.flushdb();
  sendEmailMock.mockReset();
});

const createOrderWithBrandRequest = async () => {
  const { order, items } = await createRefundableOrder({
    paymentMethod: PaymentMethod.COD,
    paymentStatus: PaymentStatus.DUE,
    lines: [{ unitPrice: UNIT_PRICE, qty: ORDERED_QTY }],
  });
  const groupId = requireFixtureId(items[0]?.group.id);
  const { brandId } = await prisma.orderFulfilmentGroup.findUniqueOrThrow({
    where: { id: groupId },
  });
  const owner = await createOwnerSessionForBrand(brandId);
  const requested = await request(testApp)
    .post(`/api/orders/brand/fulfilment-groups/${groupId}/request-cancellation`)
    .set("Authorization", owner.authHeader)
    .send({ reason: CANCELLATION_REASON });
  expect(requested.status).toBe(HTTP_STATUS.OK);
  return { order, groupId, brandId, owner };
};

const createStaff = () =>
  createAdminSessionWithPlatformPermissions("platform:orders:manage", "platform:orders:read");

const decide = (
  authHeader: string,
  groupId: string,
  action: "approve" | "reject",
  body: Record<string, unknown> = {},
) =>
  request(testApp)
    .post(`/api/orders/admin/cancellation-requests/${groupId}/${action}`)
    .set("Authorization", authHeader)
    .send(body);

describe("brand cancellation requests", () => {
  it("alerts ops when a brand files a request", async () => {
    const { order } = await createOrderWithBrandRequest();

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining(order.id) }),
    );
  });

  it("lists pending requests with the order, brand, items and reason", async () => {
    const staff = await createStaff();
    const { order, groupId } = await createOrderWithBrandRequest();

    const queue = await request(testApp)
      .get("/api/orders/admin/cancellation-requests")
      .set("Authorization", staff.authHeader);

    expect(queue.status).toBe(HTTP_STATUS.OK);
    expect(queue.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fulfilmentGroupId: groupId,
          orderId: order.id,
          reason: CANCELLATION_REASON,
          remainingAmount: UNIT_PRICE * ORDERED_QTY,
          items: [expect.objectContaining({ qty: ORDERED_QTY, refundedQty: 0 })],
        }),
      ]),
    );
  });

  it("keeps brand owners out of the staff queue", async () => {
    const { owner } = await createOrderWithBrandRequest();

    const response = await request(testApp)
      .get("/api/orders/admin/cancellation-requests")
      .set("Authorization", owner.authHeader);

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
  });

  it("refunds every remaining unit and cancels the shipment when staff approve", async () => {
    const staff = await createStaff();
    const { order, groupId, brandId } = await createOrderWithBrandRequest();

    const approved = await decide(staff.authHeader, groupId, "approve");

    expect(approved.status).toBe(HTTP_STATUS.OK);
    const refund = await prisma.orderRefund.findFirstOrThrow({ where: { orderId: order.id } });
    expect(refund).toMatchObject({
      cause: OrderRefundCause.BRAND_UNAVAILABLE,
      totalAmount: UNIT_PRICE * ORDERED_QTY + FIXTURE_DELIVERY_FEE,
    });
    expect(refund.reason).toContain(CANCELLATION_REASON);
    const group = await prisma.orderFulfilmentGroup.findUniqueOrThrow({ where: { id: groupId } });
    expect(group).toMatchObject({
      status: FulfilmentStatus.CANCELLED,
      cancellationRequestedAt: null,
    });
    expect(
      await prisma.brandFulfilmentIncident.count({
        where: { brandId, kind: BrandIncidentKind.UNAVAILABLE_ITEM },
      }),
    ).toBe(1);
    expect(
      await prisma.platformAuditLog.count({
        where: { action: PLATFORM_AUDIT_ACTION.BRAND_CANCELLATION_APPROVED, targetId: order.id },
      }),
    ).toBe(1);

    const queue = await request(testApp)
      .get("/api/orders/admin/cancellation-requests")
      .set("Authorization", staff.authHeader);
    expect(queue.body.data.items).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ fulfilmentGroupId: groupId })]),
    );
  });

  it("refuses a second approval and a rejection once the request is resolved", async () => {
    const staff = await createStaff();
    const { order, groupId } = await createOrderWithBrandRequest();

    await decide(staff.authHeader, groupId, "approve");
    const approvedAgain = await decide(staff.authHeader, groupId, "approve");
    const rejectedAfter = await decide(staff.authHeader, groupId, "reject", { note: "Too late" });

    expect(approvedAgain.status).toBe(HTTP_STATUS.CONFLICT);
    expect(approvedAgain.body.code).toBe("CANCELLATION_REQUEST_ALREADY_RESOLVED");
    expect(rejectedAfter.status).toBe(HTTP_STATUS.CONFLICT);
    expect(await prisma.orderRefund.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("applies only one refund when two staff approve at the same time", async () => {
    const firstStaff = await createStaff();
    const secondStaff = await createStaff();
    const { order, groupId } = await createOrderWithBrandRequest();

    const responses = await Promise.all([
      decide(firstStaff.authHeader, groupId, "approve"),
      decide(secondStaff.authHeader, groupId, "approve"),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([
      HTTP_STATUS.OK,
      HTTP_STATUS.CONFLICT,
    ]);
    expect(await prisma.orderRefund.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("clears the request on rejection so the brand can keep fulfilling", async () => {
    const staff = await createStaff();
    const { order, groupId, owner } = await createOrderWithBrandRequest();
    sendEmailMock.mockReset();

    const rejected = await decide(staff.authHeader, groupId, "reject", {
      note: "We found stock at the hub",
    });

    expect(rejected.status).toBe(HTTP_STATUS.OK);
    const group = await prisma.orderFulfilmentGroup.findUniqueOrThrow({ where: { id: groupId } });
    expect(group.cancellationRequestedAt).toBeNull();
    expect(await prisma.orderRefund.count({ where: { orderId: order.id } })).toBe(0);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.stringContaining("We found stock at the hub") }),
    );
    expect(
      await prisma.platformAuditLog.count({
        where: { action: PLATFORM_AUDIT_ACTION.BRAND_CANCELLATION_REJECTED, targetId: order.id },
      }),
    ).toBe(1);

    const packed = await request(testApp)
      .patch(`/api/orders/brand/fulfilment-groups/${groupId}`)
      .set("Authorization", owner.authHeader)
      .send({ status: FulfilmentStatus.PACKED });
    expect(packed.status).toBe(HTTP_STATUS.OK);
  });

  it("requires a note to reject and 404s for an unknown shipment", async () => {
    const staff = await createStaff();
    const { groupId } = await createOrderWithBrandRequest();

    const withoutNote = await decide(staff.authHeader, groupId, "reject");
    const unknown = await decide(
      staff.authHeader,
      "00000000-0000-4000-8000-000000000000",
      "approve",
    );

    expect(withoutNote.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(unknown.status).toBe(HTTP_STATUS.NOT_FOUND);
  });
});
