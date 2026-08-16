import { apiClient } from "@/shared/lib/apiClient";

import {
  type PaymentInitiateResult,
  paymentInitiateResultSchema,
  type PaymentVerifyResult,
  paymentVerifyResultSchema,
} from "./paymentsSchemas";

export const paymentsApi = {
  async initiate(orderId: string): Promise<PaymentInitiateResult> {
    const res = await apiClient.post<PaymentInitiateResult>(`/payments/${orderId}/initiate`);
    return paymentInitiateResultSchema.parse(res.data);
  },

  async verify(orderId: string): Promise<PaymentVerifyResult> {
    const res = await apiClient.post<PaymentVerifyResult>(`/payments/${orderId}/verify`);
    return paymentVerifyResultSchema.parse(res.data);
  },
};
