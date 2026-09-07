"use client";

import { useMutation } from "@tanstack/react-query";

import { checkoutApi } from "../api/checkoutApi";
import type { BuyNowLine, CheckoutInput } from "../api/checkoutSchemas";

export const useCheckout = () => {
  return useMutation({
    mutationFn: ({
      input,
      idempotencyKey,
      buyNow,
      couponCode,
    }: {
      input: CheckoutInput;
      idempotencyKey: string;
      buyNow?: BuyNowLine;
      couponCode?: string;
    }) => checkoutApi.submit(input, idempotencyKey, buyNow, couponCode),
    networkMode: "always",
  });
};
