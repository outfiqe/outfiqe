import { env } from "#config/env.config.js";
import { AppError } from "#middlewares/error-handler.js";

import type {
  PaymentInitiateInput,
  PaymentInitiateResult,
  PaymentProvider,
  PaymentRefundInput,
  PaymentRefundResult,
  PaymentVerifyInput,
  PaymentVerifyResult,
} from "../payment.types.js";
import { PaymentVerifyStatus } from "../payment.types.js";

const RUPEES_TO_PAISA = 100;
const INITIATE_FAILED_STATUS = 502;

const KhaltiLookupStatus = {
  COMPLETED: "Completed",
  PENDING: "Pending",
  INITIATED: "Initiated",
  EXPIRED: "Expired",
  USER_CANCELED: "User canceled",
  REFUNDED: "Refunded",
} as const;

const FAILED_LOOKUP_STATUSES = new Set<string>([
  KhaltiLookupStatus.EXPIRED,
  KhaltiLookupStatus.USER_CANCELED,
  KhaltiLookupStatus.REFUNDED,
]);

const khaltiHeaders = {
  Authorization: `Key ${env.KHALTI_SECRET_KEY}`,
  "Content-Type": "application/json",
};

type KhaltiInitiateResponse = { pidx: string; payment_url: string };
type KhaltiLookupResponse = { status?: string; transaction_id?: string };

export const extractKhaltiTransactionId = (rawResponse: unknown): string | null => {
  if (typeof rawResponse !== "object" || rawResponse === null) return null;
  const value = (rawResponse as Record<string, unknown>).transaction_id;
  return typeof value === "string" ? value : null;
};

export const khaltiProvider: PaymentProvider = {
  async initiate({
    transactionUuid,
    totalAmount,
    successUrl,
  }: PaymentInitiateInput): Promise<PaymentInitiateResult> {
    const res = await fetch(new URL("epayment/initiate/", env.KHALTI_BASE_URL), {
      method: "POST",
      headers: khaltiHeaders,
      body: JSON.stringify({
        return_url: successUrl,
        website_url: env.FRONTEND_URL,
        amount: totalAmount * RUPEES_TO_PAISA,
        purchase_order_id: transactionUuid,
        purchase_order_name: `Outfiqe order ${transactionUuid}`,
      }),
    });

    if (!res.ok) {
      throw new AppError(
        "PAYMENT_INITIATE_FAILED",
        "Could not start Khalti payment. Please try again.",
        INITIATE_FAILED_STATUS,
      );
    }

    const body = (await res.json()) as KhaltiInitiateResponse;
    return { mode: "REDIRECT", redirectUrl: body.payment_url, providerRef: body.pidx };
  },

  async verify({ providerRef, totalAmount }: PaymentVerifyInput): Promise<PaymentVerifyResult> {
    if (!providerRef) {
      return { status: PaymentVerifyStatus.PENDING, rawResponse: { reason: "missing pidx" } };
    }

    const res = await fetch(new URL("epayment/lookup/", env.KHALTI_BASE_URL), {
      method: "POST",
      headers: khaltiHeaders,
      body: JSON.stringify({ pidx: providerRef }),
    });

    if (!res.ok) {
      return { status: PaymentVerifyStatus.PENDING, rawResponse: { httpStatus: res.status } };
    }

    const body = (await res.json()) as KhaltiLookupResponse;

    if (body.status === KhaltiLookupStatus.COMPLETED) {
      return { status: PaymentVerifyStatus.COMPLETE, rawResponse: { ...body, totalAmount } };
    }
    if (body.status && FAILED_LOOKUP_STATUSES.has(body.status)) {
      return { status: PaymentVerifyStatus.FAILED, rawResponse: body };
    }
    return { status: PaymentVerifyStatus.PENDING, rawResponse: body };
  },

  async refund({
    gatewayTransactionId,
    payerPhone,
  }: PaymentRefundInput): Promise<PaymentRefundResult> {
    const res = await fetch(
      new URL(`merchant-transaction/${gatewayTransactionId}/refund/`, env.KHALTI_BASE_URL),
      {
        method: "POST",
        headers: khaltiHeaders,
        body: JSON.stringify({ mobile: payerPhone }),
      },
    );

    const rawResponse: unknown = await res.json().catch(() => null);
    return { succeeded: res.ok, rawResponse };
  },
};
