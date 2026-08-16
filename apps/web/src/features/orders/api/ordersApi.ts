import { apiClient } from "@/shared/lib/apiClient";

import { type Order, type OrderListPage, orderListPageSchema, orderSchema } from "./orderSchemas";

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
};
