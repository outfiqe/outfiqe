import type { Order } from "@/features/orders";
import { orderSchema } from "@/features/orders";
import { apiClient } from "@/shared/lib/apiClient";
import { getSessionId } from "@/shared/lib/sessionId";

import type { CheckoutInput } from "./checkoutSchemas";

const IDEMPOTENCY_HEADER = "Idempotency-Key";

export const checkoutApi = {
  async submit(input: CheckoutInput, idempotencyKey: string): Promise<Order> {
    const res = await apiClient.post<Order>(
      "/orders/checkout",
      { ...input, sessionId: getSessionId() },
      { headers: { [IDEMPOTENCY_HEADER]: idempotencyKey } },
    );
    return orderSchema.parse(res.data);
  },
};
