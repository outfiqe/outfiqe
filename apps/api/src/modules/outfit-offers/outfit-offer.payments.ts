import { env } from "#config/env.config.js";
import { PaymentMethod } from "#generated/prisma/enums.js";
import type {
  PaymentInitiateResult,
  PaymentProvider,
  PaymentVerifyResult,
} from "#modules/payments/payment.types.js";
import { esewaProvider } from "#modules/payments/providers/esewa.provider.js";
import {
  extractKhaltiTransactionId,
  khaltiProvider,
} from "#modules/payments/providers/khalti.provider.js";

import { OFFER_REFUND_RESULT } from "./outfit-offer.constants.js";
import { offerErrors } from "./outfit-offer.errors.js";

const NO_DELIVERY_FEE = 0;

const offerPaymentProviders: Partial<Record<PaymentMethod, PaymentProvider>> = {
  [PaymentMethod.ESEWA]: esewaProvider,
  [PaymentMethod.KHALTI]: khaltiProvider,
};

const requireOfferProvider = (method: PaymentMethod): PaymentProvider => {
  const provider = offerPaymentProviders[method];
  if (!provider) throw offerErrors.unsupportedPaymentMethod();
  return provider;
};

export type OfferRefundResult = {
  result: (typeof OFFER_REFUND_RESULT)[keyof typeof OFFER_REFUND_RESULT];
  rawResponse: unknown;
};

type OfferPaymentTarget = { id: string; amount: number; paymentMethod: PaymentMethod };

const callbackUrlFor = ({ id, paymentMethod }: OfferPaymentTarget): string =>
  `${env.FRONTEND_URL}/offers/payment/${paymentMethod.toLowerCase()}/callback/${id}`;

export const startOfferPayment = async (
  offer: OfferPaymentTarget,
  paymentId: string,
): Promise<PaymentInitiateResult> => {
  const callbackUrl = callbackUrlFor(offer);
  return requireOfferProvider(offer.paymentMethod).initiate({
    transactionUuid: paymentId,
    subtotal: offer.amount,
    deliveryFee: NO_DELIVERY_FEE,
    totalAmount: offer.amount,
    successUrl: callbackUrl,
    failureUrl: `${callbackUrl}/failed`,
  });
};

export const checkOfferPayment = async (
  offer: OfferPaymentTarget,
  payment: { id: string; transactionRef: string | null; createdAt: Date },
): Promise<PaymentVerifyResult> =>
  requireOfferProvider(offer.paymentMethod).verify({
    transactionUuid: payment.id,
    providerRef: payment.transactionRef,
    totalAmount: offer.amount,
    initiatedAt: payment.createdAt,
  });

export const refundOfferPayment = async (
  offer: OfferPaymentTarget,
  succeededPaymentResponse: unknown,
  payerPhone: string,
): Promise<OfferRefundResult> => {
  const provider = requireOfferProvider(offer.paymentMethod);
  if (!provider.refund) {
    return {
      result: OFFER_REFUND_RESULT.NEEDS_MANUAL_REFUND,
      rawResponse: { note: `${offer.paymentMethod} refunds are made by hand.` },
    };
  }

  const gatewayTransactionId = extractKhaltiTransactionId(succeededPaymentResponse);
  if (!gatewayTransactionId) {
    return {
      result: OFFER_REFUND_RESULT.NEEDS_MANUAL_REFUND,
      rawResponse: { reason: "missing gateway transaction id" },
    };
  }

  const { succeeded, rawResponse } = await provider.refund({ gatewayTransactionId, payerPhone });
  return {
    result: succeeded ? OFFER_REFUND_RESULT.REFUNDED : OFFER_REFUND_RESULT.NEEDS_MANUAL_REFUND,
    rawResponse,
  };
};
