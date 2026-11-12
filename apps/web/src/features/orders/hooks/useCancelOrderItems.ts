"use client";

import { useApiMutation } from "@outfiqe/hooks";
import { generateUuid } from "@outfiqe/utils";
import { useState } from "react";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { ordersApi } from "../api/ordersApi";
import type { CancelOrderItemsBody, OrderRefund } from "../api/refundSchemas";

export const useCancelOrderItems = (orderId: string) => {
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateUuid());

  return useApiMutation<OrderRefund, ApiClientError, CancelOrderItemsBody>({
    mutationFn: (body) => ordersApi.cancelItems(orderId, body, idempotencyKey),
    invalidateKeys: [["orders"]],
    onSuccess: () => setIdempotencyKey(generateUuid()),
  });
};
