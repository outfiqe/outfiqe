export type PaymentInitiateInput = {
  transactionUuid: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  successUrl: string;
  failureUrl: string;
};

type PaymentInitiateResultBase = {
  providerRef?: string;
};

export type PaymentInitiateResult = PaymentInitiateResultBase &
  (
    | { mode: "FORM_POST"; formUrl: string; fields: Record<string, string> }
    | { mode: "REDIRECT"; redirectUrl: string }
  );

export type PaymentVerifyInput = {
  transactionUuid: string;
  providerRef: string | null;
  totalAmount: number;
};

export const PaymentVerifyStatus = {
  COMPLETE: "COMPLETE",
  PENDING: "PENDING",
  FAILED: "FAILED",
} as const;
export type PaymentVerifyStatusValue =
  (typeof PaymentVerifyStatus)[keyof typeof PaymentVerifyStatus];

export type PaymentVerifyResult = {
  status: PaymentVerifyStatusValue;
  rawResponse: unknown;
};

export type PaymentRefundInput = {
  gatewayTransactionId: string;
  payerPhone: string;
};

export type PaymentRefundResult = {
  succeeded: boolean;
  rawResponse: unknown;
};

export interface PaymentProvider {
  initiate(input: PaymentInitiateInput): Promise<PaymentInitiateResult>;
  verify(input: PaymentVerifyInput): Promise<PaymentVerifyResult>;
  refund?(input: PaymentRefundInput): Promise<PaymentRefundResult>;
}
