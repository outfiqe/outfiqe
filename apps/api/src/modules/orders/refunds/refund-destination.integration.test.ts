import { randomUUID } from "node:crypto";

import { subDays } from "date-fns/subDays";
import { subHours } from "date-fns/subHours";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IDEMPOTENCY_HEADER } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  BankType,
  OrderRefundCause,
  OrderRefundStatus,
  PaymentMethod,
  PaymentStatus,
  RefundDestinationKind,
  UserRole,
} from "#generated/prisma/enums.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSessionWithPlatformPermissions } from "#test/integration/auth-helpers.js";
import { requireFixtureId } from "#test/integration/logistics-fixtures.js";
import { authHeaderFor } from "#test/integration/order-fixtures.js";
import { createRefundableOrder } from "#test/integration/refund-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

const sendEmailMock = vi.hoisted(() => vi.fn());
vi.mock("#lib/email.utils.js", () => ({ sendEmail: sendEmailMock }));

const { runRefundDetailsReminder, runStalePendingRefundSweep } = await import("./refund.jobs.js");

const destinationPath = (orderId: string) => `/api/orders/${orderId}/refund-destination`;
const BANK_ACCOUNT_NUMBER = "0012345678901";
const DAYS_PAST_REMINDER = 4;
const HOURS_SINCE_STUCK = 1;

const createEsewaRefundAwaitingDetails = async () => {
  const staff = await createAdminSessionWithPlatformPermissions("platform:orders:manage");
  const { order, items, buyer } = await createRefundableOrder({
    paymentMethod: PaymentMethod.ESEWA,
    paymentStatus: PaymentStatus.PAID,
    lines: [{ unitPrice: 1200, qty: 2 }],
  });
  const refund = await request(testApp)
    .post(`/api/orders/admin/${order.id}/refunds`)
    .set("Authorization", staff.authHeader)
    .set(IDEMPOTENCY_HEADER, `refund-${randomUUID()}`)
    .send({
      cause: OrderRefundCause.BRAND_UNAVAILABLE,
      reason: "Brand ran out",
      lines: [{ orderItemId: requireFixtureId(items[0]?.item.id), qty: 1 }],
    });
  return {
    staff,
    order,
    refundId: requireFixtureId(refund.body.data.id),
    buyerHeader: authHeaderFor(buyer.id, UserRole.CUSTOMER),
  };
};

const createActiveBank = () =>
  prisma.nepalBank.create({
    data: { name: "Nabil Bank", code: `NB${randomUUID().slice(0, 6)}`, type: BankType.COMMERCIAL },
  });

beforeEach(async () => {
  await redis.flushdb();
  sendEmailMock.mockReset();
});

describe("customer refund details", () => {
  it("asks the customer, suggests their wallet, and shows the details to staff", async () => {
    const { staff, order, refundId, buyerHeader } = await createEsewaRefundAwaitingDetails();
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining("Rs. 1,200 refund") }),
    );

    const before = await request(testApp)
      .get(destinationPath(order.id))
      .set("Authorization", buyerHeader);
    expect(before.body.data).toMatchObject({
      amountAwaitingDetails: 1200,
      canEdit: true,
      suggestedKind: RefundDestinationKind.ESEWA,
      suggestedWalletId: "9800000000",
      destination: null,
    });

    const saved = await request(testApp)
      .put(destinationPath(order.id))
      .set("Authorization", buyerHeader)
      .send({
        kind: RefundDestinationKind.ESEWA,
        walletId: "9812345678",
        accountName: "Refund Buyer",
        confirmsOwnership: true,
      });
    expect(saved.body.data.destination).toMatchObject({
      kind: RefundDestinationKind.ESEWA,
      walletId: "9812345678",
    });

    const queue = await request(testApp)
      .get("/api/orders/admin/refunds")
      .set("Authorization", staff.authHeader);
    expect(queue.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: refundId,
          destination: expect.objectContaining({ walletId: "9812345678" }),
        }),
      ]),
    );
  });

  it("stores a bank account number encrypted and reveals it only to staff, with an audit entry", async () => {
    const { staff, order, refundId, buyerHeader } = await createEsewaRefundAwaitingDetails();
    const bank = await createActiveBank();

    const saved = await request(testApp)
      .put(destinationPath(order.id))
      .set("Authorization", buyerHeader)
      .send({
        kind: RefundDestinationKind.BANK,
        bankId: bank.id,
        accountNumber: BANK_ACCOUNT_NUMBER,
        accountName: "Refund Buyer",
        confirmsOwnership: true,
      });

    expect(saved.body.data.destination).toMatchObject({
      bankName: "Nabil Bank",
      accountNumberLast4: "8901",
    });
    expect(JSON.stringify(saved.body)).not.toContain(BANK_ACCOUNT_NUMBER);
    const stored = await prisma.orderRefundDestination.findUniqueOrThrow({
      where: { orderId: order.id },
    });
    expect(stored.accountNumberCiphertext).not.toContain(BANK_ACCOUNT_NUMBER);

    const revealed = await request(testApp)
      .get(`/api/orders/admin/refunds/${refundId}/account-number`)
      .set("Authorization", staff.authHeader);
    expect(revealed.body.data).toEqual({ accountNumber: BANK_ACCOUNT_NUMBER });
    expect(
      await prisma.platformAuditLog.count({
        where: { targetId: order.id, action: PLATFORM_AUDIT_ACTION.ORDER_REFUND_ACCOUNT_REVEALED },
      }),
    ).toBe(1);
  });

  it("locks the details once the refund is paid", async () => {
    const { staff, order, refundId, buyerHeader } = await createEsewaRefundAwaitingDetails();
    await request(testApp)
      .post(`/api/orders/admin/refunds/${refundId}/mark-paid`)
      .set("Authorization", staff.authHeader)
      .send({ transferReference: "ESW-1001" });

    const response = await request(testApp)
      .put(destinationPath(order.id))
      .set("Authorization", buyerHeader)
      .send({
        kind: RefundDestinationKind.KHALTI,
        walletId: "9812345678",
        accountName: "Refund Buyer",
        confirmsOwnership: true,
      });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("NO_REFUND_AWAITING_DETAILS");
  });

  it("refuses details without ownership confirmation, a bad wallet number, or for someone else's order", async () => {
    const { order, buyerHeader } = await createEsewaRefundAwaitingDetails();
    const stranger = await createRefundableOrder({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 100, qty: 1 }],
    });
    const body = {
      kind: RefundDestinationKind.KHALTI,
      walletId: "9812345678",
      accountName: "Refund Buyer",
      confirmsOwnership: true,
    };

    const unconfirmed = await request(testApp)
      .put(destinationPath(order.id))
      .set("Authorization", buyerHeader)
      .send({ ...body, confirmsOwnership: false });
    const badWallet = await request(testApp)
      .put(destinationPath(order.id))
      .set("Authorization", buyerHeader)
      .send({ ...body, walletId: "12345" });
    const notMine = await request(testApp)
      .put(destinationPath(order.id))
      .set("Authorization", authHeaderFor(stranger.buyer.id, UserRole.CUSTOMER))
      .send(body);

    expect(unconfirmed.status).toBe(422);
    expect(badWallet.status).toBe(422);
    expect(notMine.status).toBe(404);
  });
});

describe("refund jobs", () => {
  it("reminds the customer once after three days without details", async () => {
    const { order, refundId } = await createEsewaRefundAwaitingDetails();
    await prisma.orderRefund.update({
      where: { id: refundId },
      data: { createdAt: subDays(new Date(), DAYS_PAST_REMINDER) },
    });
    sendEmailMock.mockReset();

    await runRefundDetailsReminder();
    await runRefundDetailsReminder();

    const remindersForThisOrder = sendEmailMock.mock.calls.filter(
      ([email]) =>
        String(email.subject).startsWith("Reminder") && String(email.body).includes(order.id),
    );
    expect(remindersForThisOrder).toHaveLength(1);
    expect(
      (await prisma.orderRefund.findUniqueOrThrow({ where: { id: refundId } }))
        .detailsReminderSentAt,
    ).not.toBeNull();
  });

  it("moves a refund whose payment step never finished into the manual queue", async () => {
    const { order } = await createRefundableOrder({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.PAID,
      lines: [{ unitPrice: 500, qty: 1 }],
    });
    const stuckRefund = await prisma.orderRefund.create({
      data: {
        orderId: order.id,
        cause: OrderRefundCause.STAFF_ADJUSTMENT,
        reason: "Stuck",
        goodsAmount: 500,
        feeAmount: 0,
        totalAmount: 500,
        createdAt: subHours(new Date(), HOURS_SINCE_STUCK),
      },
    });

    await runStalePendingRefundSweep();

    const [refund, refreshedOrder] = await Promise.all([
      prisma.orderRefund.findUniqueOrThrow({ where: { id: stuckRefund.id } }),
      prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ]);
    expect(refund.status).toBe(OrderRefundStatus.NEEDS_MANUAL);
    expect(refreshedOrder.needsManualRefund).toBe(true);
  });
});
