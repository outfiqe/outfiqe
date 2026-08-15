"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CART_QUERY_KEY } from "@/features/cart";

import { checkoutApi } from "../api/checkoutApi";
import type { CheckoutInput } from "../api/checkoutSchemas";

export const useCheckout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CheckoutInput; idempotencyKey: string }) =>
      checkoutApi.submit(input, idempotencyKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
};
