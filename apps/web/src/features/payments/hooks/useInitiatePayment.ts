"use client";

import { useMutation } from "@tanstack/react-query";

import { paymentsApi } from "../api/paymentsApi";

export const useInitiatePayment = () => {
  return useMutation({
    mutationFn: (orderId: string) => paymentsApi.initiate(orderId),
    networkMode: "always",
  });
};
