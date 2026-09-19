"use client";

import { useApiMutation } from "@outfiqe/hooks";

import { ordersApi } from "../api/ordersApi";

export const useCancelOrder = (orderId: string) =>
  useApiMutation({
    mutationFn: (reason?: string) => ordersApi.cancel(orderId, reason),
    invalidateKeys: [["orders"]],
  });
