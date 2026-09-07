"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ApiClientError } from "@/shared/lib/apiClient";

import { paymentsApi } from "../api/paymentsApi";

const ALREADY_PAID_CODE = "ALREADY_SETTLED";

export const isAlreadyPaidError = (error: unknown): boolean =>
  error instanceof ApiClientError && error.code === ALREADY_PAID_CODE;

export const useInitiatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => paymentsApi.initiate(orderId),
    networkMode: "always",
    onError: (error) => {
      if (isAlreadyPaidError(error)) {
        void queryClient.invalidateQueries({ queryKey: ["orders"] });
        void queryClient.invalidateQueries({ queryKey: ["payment-verify"] });
      }
    },
  });
};
