"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cartApi } from "../api/cartApi";
import { CART_QUERY_KEY } from "../cart.constants";

export const useApplyCoupon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => cartApi.applyCoupon(code),
    onSuccess: (cart) => queryClient.setQueryData(CART_QUERY_KEY, cart),
  });
};
