import { IDEMPOTENCY_HEADER } from "@outfiqe/client";

import { apiClient } from "@/lib/apiClient";

import {
  type OrderRefund,
  orderRefundSchema,
  orderRefundsResponseSchema,
  type RefundOrderItemsBody,
  type RefundQueuePage,
  refundQueuePageSchema,
  revealedAccountNumberSchema,
} from "./refundsSchemas";

const ADMIN_ORDERS_PATH = "/orders/admin";
const REFUND_QUEUE_PATH = `${ADMIN_ORDERS_PATH}/refunds`;

export const refundsApi = {
  async listForOrder(orderId: string): Promise<OrderRefund[]> {
    const res = await apiClient.get(`${ADMIN_ORDERS_PATH}/${orderId}/refunds`);
    return orderRefundsResponseSchema.parse(res.data).refunds;
  },

  async refundItems(
    orderId: string,
    body: RefundOrderItemsBody,
    idempotencyKey: string,
  ): Promise<OrderRefund> {
    const res = await apiClient.post(`${ADMIN_ORDERS_PATH}/${orderId}/refunds`, body, {
      headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
    });
    return orderRefundSchema.parse(res.data);
  },

  async listQueue(cursor?: string): Promise<RefundQueuePage> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const res = await apiClient.get(`${REFUND_QUEUE_PATH}${query}`);
    return refundQueuePageSchema.parse(res.data);
  },

  async markPaid(refundId: string, transferReference: string): Promise<OrderRefund> {
    const res = await apiClient.post(`${REFUND_QUEUE_PATH}/${refundId}/mark-paid`, {
      transferReference,
    });
    return orderRefundSchema.parse(res.data);
  },

  async revealAccountNumber(refundId: string): Promise<string> {
    const res = await apiClient.get(`${REFUND_QUEUE_PATH}/${refundId}/account-number`);
    return revealedAccountNumberSchema.parse(res.data).accountNumber;
  },
};
