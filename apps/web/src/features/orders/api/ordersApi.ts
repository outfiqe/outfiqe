import { IDEMPOTENCY_HEADER } from "@outfiqe/client";

import { apiClient } from "@/shared/lib/apiClient";

import { type Order, type OrderListPage, orderListPageSchema, orderSchema } from "./orderSchemas";
import {
  type CancelOrderItemsBody,
  type MyRefundDestination,
  myRefundDestinationSchema,
  type OrderRefund,
  orderRefundSchema,
  orderRefundsResponseSchema,
  type SaveRefundDestinationBody,
} from "./refundSchemas";
import {
  type CustomerOrderTracking,
  customerOrderTrackingSchema,
  type CustomerParcel,
  customerParcelSchema,
  type ReportNotReceivedBody,
} from "./trackingSchemas";

export const ordersApi = {
  async get(orderId: string): Promise<Order> {
    const res = await apiClient.get<Order>(`/orders/${orderId}`);
    return orderSchema.parse(res.data);
  },

  async list(cursor?: string): Promise<OrderListPage> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<OrderListPage>(`/orders?${params.toString()}`);
    return orderListPageSchema.parse(res.data);
  },

  async cancel(orderId: string, reason?: string): Promise<void> {
    await apiClient.post(`/orders/${orderId}/cancel`, reason ? { reason } : {});
  },

  async listRefunds(orderId: string): Promise<OrderRefund[]> {
    const res = await apiClient.get(`/orders/${orderId}/refunds`);
    return orderRefundsResponseSchema.parse(res.data).refunds;
  },

  async cancelItems(
    orderId: string,
    body: CancelOrderItemsBody,
    idempotencyKey: string,
  ): Promise<OrderRefund> {
    const res = await apiClient.post(`/orders/${orderId}/line-cancellations`, body, {
      headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
    });
    return orderRefundSchema.parse(res.data);
  },

  async getRefundDestination(orderId: string): Promise<MyRefundDestination> {
    const res = await apiClient.get(`/orders/${orderId}/refund-destination`);
    return myRefundDestinationSchema.parse(res.data);
  },

  async saveRefundDestination(
    orderId: string,
    body: SaveRefundDestinationBody,
  ): Promise<MyRefundDestination> {
    const res = await apiClient.put(`/orders/${orderId}/refund-destination`, body);
    return myRefundDestinationSchema.parse(res.data);
  },

  async getTracking(orderId: string): Promise<CustomerOrderTracking> {
    const res = await apiClient.get(`/logistics/orders/${orderId}/tracking`);
    return customerOrderTrackingSchema.parse(res.data);
  },

  async reportNotReceived(orderId: string, body: ReportNotReceivedBody): Promise<CustomerParcel> {
    const res = await apiClient.post(`/logistics/orders/${orderId}/delivery-disputes`, body);
    return customerParcelSchema.parse(res.data);
  },
};
