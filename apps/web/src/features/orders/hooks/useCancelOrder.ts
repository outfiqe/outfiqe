"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ordersApi } from "../api/ordersApi";

export const useCancelOrder = (orderId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason?: string) => ordersApi.cancel(orderId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });
};
