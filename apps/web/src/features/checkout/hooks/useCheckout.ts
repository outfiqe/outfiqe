"use client";

import { useMutation } from "@tanstack/react-query";

import { checkoutApi } from "../api/checkoutApi";
import type { CheckoutInput } from "../api/checkoutSchemas";

export const useCheckout = () => {
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CheckoutInput; idempotencyKey: string }) =>
      checkoutApi.submit(input, idempotencyKey),
  });
};
