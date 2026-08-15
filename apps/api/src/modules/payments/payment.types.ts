export type PaymentInitiateInput = {
  transactionUuid: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  successUrl: string;
  failureUrl: string;
};

export type PaymentInitiateResult = {
  formUrl: string;
  fields: Record<string, string>;
};

export type PaymentVerifyInput = {
  transactionUuid: string;
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

export interface PaymentProvider {
  initiate(input: PaymentInitiateInput): PaymentInitiateResult;
  verify(input: PaymentVerifyInput): Promise<PaymentVerifyResult>;
}
