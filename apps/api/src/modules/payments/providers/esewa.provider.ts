import crypto from "node:crypto";

import { env } from "#config/env.config.js";

import type {
  PaymentInitiateInput,
  PaymentInitiateResult,
  PaymentProvider,
  PaymentVerifyInput,
  PaymentVerifyResult,
} from "../payment.types.js";
import { PaymentVerifyStatus } from "../payment.types.js";

const SIGNED_FIELD_NAMES = "total_amount,transaction_uuid,product_code";

const buildSignature = (totalAmount: number, transactionUuid: string): string => {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${env.ESEWA_PRODUCT_CODE}`;
  return crypto.createHmac("sha256", env.ESEWA_SECRET_KEY).update(message).digest("base64");
};

const EsewaStatusLookup = {
  COMPLETE: "COMPLETE",
  CANCELED: "CANCELED",
  NOT_FOUND: "NOT_FOUND",
  AMBIGUOUS: "AMBIGUOUS",
} as const;

const FAILED_STATUSES = new Set<string>([EsewaStatusLookup.CANCELED, EsewaStatusLookup.AMBIGUOUS]);

export const esewaProvider: PaymentProvider = {
  async initiate({
    transactionUuid,
    subtotal,
    deliveryFee,
    totalAmount,
    successUrl,
    failureUrl,
  }: PaymentInitiateInput): Promise<PaymentInitiateResult> {
    return {
      mode: "FORM_POST",
      formUrl: env.ESEWA_BASE_URL,
      providerRef: transactionUuid,
      fields: {
        amount: String(subtotal),
        tax_amount: "0",
        total_amount: String(totalAmount),
        transaction_uuid: transactionUuid,
        product_code: env.ESEWA_PRODUCT_CODE,
        product_service_charge: "0",
        product_delivery_charge: String(deliveryFee),
        success_url: successUrl,
        failure_url: failureUrl,
        signed_field_names: SIGNED_FIELD_NAMES,
        signature: buildSignature(totalAmount, transactionUuid),
      },
    };
  },

  async verify({ transactionUuid, totalAmount }: PaymentVerifyInput): Promise<PaymentVerifyResult> {
    const url = new URL(env.ESEWA_STATUS_URL);
    url.searchParams.set("product_code", env.ESEWA_PRODUCT_CODE);
    url.searchParams.set("total_amount", String(totalAmount));
    url.searchParams.set("transaction_uuid", transactionUuid);

    let res: Response;
    try {
      res = await fetch(url);
    } catch (error) {
      return {
        status: PaymentVerifyStatus.PENDING,
        rawResponse: { unreachable: error instanceof Error ? error.message : String(error) },
      };
    }

    if (!res.ok) {
      return { status: PaymentVerifyStatus.PENDING, rawResponse: { httpStatus: res.status } };
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch (error) {
      return {
        status: PaymentVerifyStatus.PENDING,
        rawResponse: { parseError: error instanceof Error ? error.message : String(error) },
      };
    }

    const status =
      typeof body === "object" && body !== null && "status" in body ? body.status : null;

    if (status === EsewaStatusLookup.COMPLETE) {
      return { status: PaymentVerifyStatus.COMPLETE, rawResponse: body };
    }
    if (typeof status === "string" && FAILED_STATUSES.has(status)) {
      return { status: PaymentVerifyStatus.FAILED, rawResponse: body };
    }
    return { status: PaymentVerifyStatus.PENDING, rawResponse: body };
  },
};
