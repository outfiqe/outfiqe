"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { ordersApi } from "../api/ordersApi";
import type { MyRefundDestination, SaveRefundDestinationBody } from "../api/refundSchemas";
import { refundDestinationQueryKey } from "../constants/refundQueryKeys";

export const useSaveRefundDestination = (orderId: string) =>
  useApiMutation<MyRefundDestination, ApiClientError, SaveRefundDestinationBody>({
    mutationFn: (body) => ordersApi.saveRefundDestination(orderId, body),
    invalidateKeys: [refundDestinationQueryKey(orderId)],
    successMessage: "Refund details saved.",
  });
