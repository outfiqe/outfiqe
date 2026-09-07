import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { testApp } from "#test/integration/testApp.js";

const esewaInitiate = vi.hoisted(() => vi.fn());
const esewaVerify = vi.hoisted(() => vi.fn());

vi.mock("#modules/payments/providers/esewa.provider.js", () => ({
  esewaProvider: { initiate: esewaInitiate, verify: esewaVerify },
}));

const authHeaderFor = (userId: string): string =>
  `Bearer ${generateTokenpair({ sub: userId, role: UserRole.CUSTOMER }).accessToken}`;

const createEsewaOrderAwaitingPayment = async () => {
  const suffix = randomUUID().slice(0, 8);
  const buyer = await prisma.user.create({
    data: {
      email: `payments-buyer-${suffix}@outfiqe.test`,
      name: "Payments Buyer",
      handle: `payments-buyer-${suffix}`,
      phone: `98${suffix.replace(/\D/g, "0").padEnd(8, "0").slice(0, 8)}`,
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });

  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      fullName: "Payments Buyer",
      phone: "9800000000",
      address: "123 Test Street",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.ESEWA,
      subtotal: 1000,
      deliveryFee: 100,
      total: 1100,
      transactions: { create: { provider: PaymentMethod.ESEWA } },
    },
    include: { transactions: true },
  });

  return { buyer, order, firstTransactionId: order.transactions[0]!.id };
};

const initiate = (orderId: string, userId: string) =>
  request(testApp)
    .post(`/api/payments/${orderId}/initiate`)
    .set("Authorization", authHeaderFor(userId));

beforeEach(() => {
  vi.clearAllMocks();
  esewaInitiate.mockImplementation(async () => ({
    mode: "FORM_POST" as const,
    formUrl: "https://pay.example/esewa/form",
    fields: { transaction_uuid: `esewa-${randomUUID()}` },
    providerRef: `esewa-${randomUUID()}`,
  }));
  esewaVerify.mockResolvedValue({ status: "PENDING", rawResponse: {} });
});

describe("POST /api/payments/:orderId/initiate — retrying a wallet payment", () => {
  it("starts a fresh transaction with a new gateway ref instead of reusing a spent one", async () => {
    const { buyer, order, firstTransactionId } = await createEsewaOrderAwaitingPayment();

    const first = await initiate(order.id, buyer.id);
    expect(first.status).toBe(200);

    const afterFirst = await prisma.paymentTransaction.findUniqueOrThrow({
      where: { id: firstTransactionId },
    });
    expect(afterFirst.transactionRef).not.toBeNull();

    esewaVerify.mockResolvedValue({ status: "FAILED", rawResponse: { status: "CANCELED" } });

    const second = await initiate(order.id, buyer.id);
    expect(second.status).toBe(200);

    const transactions = await prisma.paymentTransaction.findMany({
      where: { orderId: order.id },
    });
    const superseded = transactions.find((entry) => entry.id === firstTransactionId);
    const active = transactions.find((entry) => entry.id !== firstTransactionId);

    expect(transactions).toHaveLength(2);
    expect(superseded?.status).toBe(PaymentTransactionStatus.FAILED);
    expect(active?.status).toBe(PaymentTransactionStatus.INITIATED);
    expect(active?.transactionRef).not.toBe(superseded?.transactionRef);
    expect(esewaInitiate).toHaveBeenCalledTimes(2);
  });

  it("settles the order instead of charging again when the prior attempt actually completed", async () => {
    const { buyer, order } = await createEsewaOrderAwaitingPayment();

    await initiate(order.id, buyer.id);

    esewaVerify.mockResolvedValue({ status: "COMPLETE", rawResponse: { status: "COMPLETE" } });

    const second = await initiate(order.id, buyer.id);

    expect(second.status).toBe(409);
    expect(second.body.code).toBe("ALREADY_SETTLED");

    const settled = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(settled.paymentStatus).toBe(PaymentStatus.PAID);
    expect(esewaInitiate).toHaveBeenCalledTimes(1);
  });
});
