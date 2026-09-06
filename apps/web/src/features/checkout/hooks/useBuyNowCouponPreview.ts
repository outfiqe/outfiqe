"use client";

import { useMutation } from "@tanstack/react-query";

import { checkoutApi } from "../api/checkoutApi";
import type { BuyNowLine } from "../api/checkoutSchemas";

export const useBuyNowCouponPreview = () => {
  return useMutation({
    mutationFn: ({ code, line }: { code: string; line: BuyNowLine }) =>
      checkoutApi.previewBuyNowCoupon(code, line),
  });
};
