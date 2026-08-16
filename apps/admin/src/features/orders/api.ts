import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import {
  type AdminOrder,
  adminOrderSchema,
  adminOrderSummarySchema,
  type FulfilmentStatusValue,
} from "./schemas";

const orderPageSchema = z.object({
  orders: z.array(adminOrderSummarySchema),
  nextCursor: z.string().nullable(),
});
export type OrderPage = z.infer<typeof orderPageSchema>;

export const ordersApi = {
  async list(status?: FulfilmentStatusValue, cursor?: string): Promise<OrderPage> {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (cursor) params.set("cursor", cursor);

    const query = params.toString();
    const res = await apiClient.get<OrderPage>(`/orders/admin${query ? `?${query}` : ""}`);
    return orderPageSchema.parse(res.data);
  },

  async get(orderId: string): Promise<AdminOrder> {
    const res = await apiClient.get<AdminOrder>(`/orders/admin/${orderId}`);
    return adminOrderSchema.parse(res.data);
  },

  async advanceFulfilment(orderId: string, status: FulfilmentStatusValue): Promise<void> {
    await apiClient.patch(`/orders/admin/${orderId}/fulfilment`, { status });
  },

  async cancel(orderId: string, reason: string): Promise<void> {
    await apiClient.post(`/orders/admin/${orderId}/cancel`, { reason });
  },
};
