import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import {
  FulfilmentMode,
  FulfilmentStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionStatus,
  PickupStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { createPurchasableProduct } from "#test/integration/order-fixtures.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

import { RECONCILE_EXPIRE_AFTER_MS } from "./payment.constants.js";
import { runPaymentReconciliationSweep } from "./payment.reconciliation.js";

const esewaInitiate = vi.hoisted(() => vi.fn());
const esewaVerify = vi.hoisted(() => vi.fn());

vi.mock("#modules/payments/providers/esewa.provider.js", () => ({
  esewaProvider: { initiate: esewaInitiate, verify: esewaVerify },
}));

const authHeaderFor = (userId: string): string =>
  `Bearer ${generateTokenpair({ sub: userId, role: UserRole.CUSTOMER }).accessToken}`;

const PRODUCT_PRICE = 1000;
const HOURS_AFTER_EXPIRY_MS = 60 * 60 * 1000;
const OVERLAPPING_VERIFICATIONS = 2;

const createEsewaOrderAwaitingPayment = async (createdAt?: Date) => {
  const suffix = randomUUID().slice(0, 8);
  const buyer = await prisma.user.create({
    data: {
      email: `late-settlement-${suffix}@outfiqe.test`,
      name: "Late Settlement Buyer",
      handle: `late-settlement-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });
  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      fullName: "Late Settlement Buyer",
      phone: "9800000000",
      address: "123 Test Street",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.ESEWA,
      subtotal: 1000,
      deliveryFee: 100,
      total: 1100,
      ...(createdAt ? { createdAt } : {}),
      transactions: {
        create: { provider: PaymentMethod.ESEWA, transactionRef: `esewa-${randomUUID()}` },
      },
    },
  });
  return { buyer, order };
};

beforeEach(() => {
  vi.clearAllMocks();
  esewaInitiate.mockImplementation(async () => ({
    mode: "FORM_POST" as const,
    formUrl: "https://pay.example/esewa/form",
    fields: {},
    providerRef: `esewa-${randomUUID()}`,
  }));
});

const retryPayment = (orderId: string, buyerId: string) =>
  request(testApp)
    .post(`/api/payments/${orderId}/initiate`)
    .set("Authorization", authHeaderFor(buyerId));

const readFirstAttemptRef = async (orderId: string): Promise<string | null> =>
  (await prisma.paymentTransaction.findFirstOrThrow({ where: { orderId } })).transactionRef;

describe("payment recognition after the buyer pays late", () => {
  it("rejects a further retry once a superseded attempt turns out to be paid", async () => {
    const { buyer, order } = await createEsewaOrderAwaitingPayment();
    const firstAttemptRef = await readFirstAttemptRef(order.id);
    esewaVerify.mockResolvedValue({ status: "PENDING", rawResponse: {} });
    expect((await retryPayment(order.id, buyer.id)).status).toBe(200);

    esewaVerify.mockImplementation(async ({ providerRef }: { providerRef: string | null }) =>
      providerRef === firstAttemptRef
        ? { status: "COMPLETE", rawResponse: { status: "COMPLETE" } }
        : { status: "PENDING", rawResponse: {} },
    );
    const secondRetry = await retryPayment(order.id, buyer.id);

    expect(secondRetry.status).toBe(409);
    expect(secondRetry.body.code).toBe("ALREADY_SETTLED");
    const reloaded = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(reloaded.paymentStatus).toBe(PaymentStatus.PAID);
  });

  it("still settles the open attempt when the gateway cannot verify a superseded one", async () => {
    const { buyer, order } = await createEsewaOrderAwaitingPayment();
    const firstAttemptRef = await readFirstAttemptRef(order.id);
    esewaVerify.mockResolvedValue({ status: "PENDING", rawResponse: {} });
    expect((await retryPayment(order.id, buyer.id)).status).toBe(200);

    esewaVerify.mockImplementation(async ({ providerRef }: { providerRef: string | null }) => {
      if (providerRef === firstAttemptRef) throw new Error("gateway timeout");
      return { status: "COMPLETE", rawResponse: { status: "COMPLETE" } };
    });
    const verification = await request(testApp)
      .post(`/api/payments/${order.id}/verify`)
      .set("Authorization", authHeaderFor(buyer.id));

    expect(verification.body.data.status).toBe("COMPLETE");
    const reloaded = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(reloaded.paymentStatus).toBe(PaymentStatus.PAID);
  });

  it("settles an order whose first attempt was superseded by a retry and then completed at the gateway", async () => {
    const { buyer, order } = await createEsewaOrderAwaitingPayment();
    const firstAttemptRef = (
      await prisma.paymentTransaction.findFirstOrThrow({ where: { orderId: order.id } })
    ).transactionRef;

    esewaVerify.mockResolvedValue({ status: "PENDING", rawResponse: {} });
    const retry = await request(testApp)
      .post(`/api/payments/${order.id}/initiate`)
      .set("Authorization", authHeaderFor(buyer.id));
    expect(retry.status).toBe(200);

    esewaVerify.mockImplementation(async ({ providerRef }: { providerRef: string | null }) =>
      providerRef === firstAttemptRef
        ? { status: "COMPLETE", rawResponse: { status: "COMPLETE" } }
        : { status: "PENDING", rawResponse: {} },
    );
    await request(testApp)
      .post(`/api/payments/${order.id}/verify`)
      .set("Authorization", authHeaderFor(buyer.id));

    const reloaded = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(reloaded.paymentStatus).toBe(PaymentStatus.PAID);
  });

  it("announces the purchase once when two verifications settle the same payment at once", async () => {
    const { buyer, order } = await createEsewaOrderAwaitingPayment();
    const publishSpy = vi.spyOn(eventBus, "publish");
    let verificationsStarted = 0;
    let releaseVerifications = (): void => undefined;
    const allVerificationsStarted = new Promise<void>((resolve) => {
      releaseVerifications = resolve;
    });
    esewaVerify.mockImplementation(async () => {
      verificationsStarted += 1;
      if (verificationsStarted === OVERLAPPING_VERIFICATIONS) releaseVerifications();
      await allVerificationsStarted;
      return { status: "COMPLETE", rawResponse: { status: "COMPLETE" } };
    });
    const verifyPayment = () =>
      request(testApp)
        .post(`/api/payments/${order.id}/verify`)
        .set("Authorization", authHeaderFor(buyer.id));

    const verifications = await Promise.all([verifyPayment(), verifyPayment()]);

    expect(verifications.map(({ body }) => body.data.status)).toEqual(["COMPLETE", "COMPLETE"]);
    const purchaseAnnouncements = publishSpy.mock.calls.filter(
      ([event, payload]) =>
        event === DomainEvents.PRODUCT_PURCHASED &&
        typeof payload === "object" &&
        payload !== null &&
        "orderId" in payload &&
        payload.orderId === order.id,
    );
    expect(purchaseAnnouncements).toHaveLength(1);
    const reloaded = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(reloaded.paymentStatus).toBe(PaymentStatus.PAID);
    publishSpy.mockRestore();
  });

  it("verifies with the gateway before expiring an order past the reconciliation window", async () => {
    const stale = new Date(Date.now() - RECONCILE_EXPIRE_AFTER_MS - HOURS_AFTER_EXPIRY_MS);
    const { order } = await createEsewaOrderAwaitingPayment(stale);
    esewaVerify.mockResolvedValue({ status: "COMPLETE", rawResponse: { status: "COMPLETE" } });

    await runPaymentReconciliationSweep();

    const reloaded = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(reloaded.paymentStatus).toBe(PaymentStatus.PAID);
  });

  it("expires an overdue order the gateway never completed and fails its pending attempt", async () => {
    const stale = new Date(Date.now() - RECONCILE_EXPIRE_AFTER_MS - HOURS_AFTER_EXPIRY_MS);
    const { order } = await createEsewaOrderAwaitingPayment(stale);
    esewaVerify.mockResolvedValue({ status: "PENDING", rawResponse: {} });

    const outcome = await runPaymentReconciliationSweep();

    expect(outcome.expired).toBe(1);
    const reloaded = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { transactions: true },
    });
    expect(reloaded.paymentStatus).toBe(PaymentStatus.FAILED);
    expect(reloaded.transactions.map(({ status }) => status)).toEqual([
      PaymentTransactionStatus.FAILED,
    ]);
  });

  it("takes an expired order off the brand's list and cancels its pickup", async () => {
    const stale = new Date(Date.now() - RECONCILE_EXPIRE_AFTER_MS - HOURS_AFTER_EXPIRY_MS);
    const { order } = await createEsewaOrderAwaitingPayment(stale);
    const { brand } = await createPurchasableProduct(PRODUCT_PRICE);
    await prisma.orderFulfilmentGroup.create({
      data: {
        orderId: order.id,
        brandId: brand.id,
        fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
        pickupStatus: PickupStatus.AWAITING_BRAND,
      },
    });
    esewaVerify.mockResolvedValue({ status: "PENDING", rawResponse: {} });

    await runPaymentReconciliationSweep();

    const group = await prisma.orderFulfilmentGroup.findFirstOrThrow({
      where: { orderId: order.id },
    });
    expect(group.status).toBe(FulfilmentStatus.CANCELLED);
    expect(group.pickupStatus).toBe(PickupStatus.CANCELLED);
  });

  it("leaves an overdue order untouched when the gateway cannot be reached", async () => {
    const stale = new Date(Date.now() - RECONCILE_EXPIRE_AFTER_MS - HOURS_AFTER_EXPIRY_MS);
    const { order } = await createEsewaOrderAwaitingPayment(stale);
    esewaVerify.mockRejectedValue(new Error("gateway timeout"));

    const outcome = await runPaymentReconciliationSweep();

    expect(outcome.expired).toBe(0);
    const reloaded = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(reloaded.paymentStatus).toBe(PaymentStatus.INITIATED);
  });
});
