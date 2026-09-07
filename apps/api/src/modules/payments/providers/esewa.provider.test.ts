import crypto from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { PaymentVerifyStatus } from "../payment.types.js";
import { esewaProvider } from "./esewa.provider.js";

const envMock = vi.hoisted(() => ({
  env: {
    ESEWA_PRODUCT_CODE: "EPAYTEST",
    ESEWA_SECRET_KEY: "8gBm/:&EnhH.1/q",
    ESEWA_BASE_URL: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    ESEWA_STATUS_URL: "https://rc.esewa.com.np/api/epay/transaction/status/",
  },
}));

vi.mock("#config/env.config.js", () => envMock);

const THREE_MINUTES_MS = 3 * 60 * 1000;

const statusResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const errorResponse = (statusCode: number): Response => new Response(null, { status: statusCode });

const unparseableResponse = (): Response => new Response("<<not json>>", { status: 200 });

const verifyInput = (overrides: Partial<Parameters<typeof esewaProvider.verify>[0]> = {}) => ({
  transactionUuid: "txn-1",
  providerRef: "txn-1",
  totalAmount: 2760,
  initiatedAt: new Date(),
  ...overrides,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("esewaProvider.initiate", () => {
  it("builds a FORM_POST payload with a base64 HMAC-SHA256 signature over the signed fields", async () => {
    const result = await esewaProvider.initiate({
      transactionUuid: "txn-1",
      subtotal: 2500,
      deliveryFee: 260,
      totalAmount: 2760,
      successUrl: "https://outfiqe.test/payments/esewa/callback?orderId=order-1",
      failureUrl: "https://outfiqe.test/payments/esewa/callback?orderId=order-1",
    });

    const expectedSignature = crypto
      .createHmac("sha256", envMock.env.ESEWA_SECRET_KEY)
      .update("total_amount=2760,transaction_uuid=txn-1,product_code=EPAYTEST")
      .digest("base64");

    expect(result).toMatchObject({
      mode: "FORM_POST",
      formUrl: envMock.env.ESEWA_BASE_URL,
      providerRef: "txn-1",
      fields: {
        amount: "2500",
        total_amount: "2760",
        transaction_uuid: "txn-1",
        product_code: "EPAYTEST",
        product_delivery_charge: "260",
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature: expectedSignature,
      },
    });
  });
});

describe("esewaProvider.verify", () => {
  it("maps COMPLETE to COMPLETE", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(statusResponse({ status: "COMPLETE" })));

    const result = await esewaProvider.verify(verifyInput());

    expect(result.status).toBe(PaymentVerifyStatus.COMPLETE);
  });

  it("maps CANCELED to FAILED", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(statusResponse({ status: "CANCELED" })));

    const result = await esewaProvider.verify(verifyInput());

    expect(result.status).toBe(PaymentVerifyStatus.FAILED);
  });

  it("maps AMBIGUOUS to FAILED", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(statusResponse({ status: "AMBIGUOUS" })));

    const result = await esewaProvider.verify(verifyInput());

    expect(result.status).toBe(PaymentVerifyStatus.FAILED);
  });

  it("keeps NOT_FOUND as PENDING while the transaction is inside the grace window", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(statusResponse({ status: "NOT_FOUND" })));

    const result = await esewaProvider.verify(
      verifyInput({ initiatedAt: new Date(Date.now() - THREE_MINUTES_MS + 30_000) }),
    );

    expect(result.status).toBe(PaymentVerifyStatus.PENDING);
  });

  it("treats NOT_FOUND as FAILED once the transaction is older than the grace window", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(statusResponse({ status: "NOT_FOUND" })));

    const result = await esewaProvider.verify(
      verifyInput({ initiatedAt: new Date(Date.now() - THREE_MINUTES_MS - 1000) }),
    );

    expect(result.status).toBe(PaymentVerifyStatus.FAILED);
  });

  it("returns PENDING with an unknown status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(statusResponse({ status: "PENDING" })));

    const result = await esewaProvider.verify(verifyInput());

    expect(result.status).toBe(PaymentVerifyStatus.PENDING);
  });

  it("returns PENDING when the status endpoint is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNRESET")));

    const result = await esewaProvider.verify(verifyInput());

    expect(result.status).toBe(PaymentVerifyStatus.PENDING);
    expect(result.rawResponse).toMatchObject({ unreachable: "ECONNRESET" });
  });

  it("returns PENDING when the status endpoint responds with a non-2xx", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse(503)));

    const result = await esewaProvider.verify(verifyInput());

    expect(result.status).toBe(PaymentVerifyStatus.PENDING);
    expect(result.rawResponse).toMatchObject({ httpStatus: 503 });
  });

  it("returns PENDING when the status body is not valid JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(unparseableResponse()));

    const result = await esewaProvider.verify(verifyInput());

    expect(result.status).toBe(PaymentVerifyStatus.PENDING);
    expect(result.rawResponse).toMatchObject({ parseError: expect.any(String) });
  });
});
