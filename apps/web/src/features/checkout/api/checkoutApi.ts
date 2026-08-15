import { apiClient } from "@/shared/lib/apiClient";

import { type CheckoutInput, type Order, orderSchema } from "./checkoutSchemas";

const IDEMPOTENCY_HEADER = "Idempotency-Key";

export const checkoutApi = {
  async submit(input: CheckoutInput, idempotencyKey: string): Promise<Order> {
    const res = await apiClient.post<Order>("/orders/checkout", input, {
      headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
    });
    return orderSchema.parse(res.data);
  },

  async get(orderId: string): Promise<Order> {
    const res = await apiClient.get<Order>(`/orders/${orderId}`);
    return orderSchema.parse(res.data);
  },
};
