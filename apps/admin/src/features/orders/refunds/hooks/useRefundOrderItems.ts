import { useApiMutation } from "@outfiqe/hooks";
import { useState } from "react";

import type { ApiClientError } from "@/lib/apiClient";

import { refundsApi } from "../api/refundsApi";
import type { OrderRefund, RefundOrderItemsBody } from "../api/refundsSchemas";
import { REFUND_QUEUE_QUERY_KEY } from "../constants/refundQueryKeys";

export const useRefundOrderItems = (orderId: string) => {
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  return useApiMutation<OrderRefund, ApiClientError, RefundOrderItemsBody>({
    mutationFn: (body) => refundsApi.refundItems(orderId, body, idempotencyKey),
    invalidateKeys: [["admin-orders"], REFUND_QUEUE_QUERY_KEY],
    onSuccess: () => setIdempotencyKey(crypto.randomUUID()),
  });
};
