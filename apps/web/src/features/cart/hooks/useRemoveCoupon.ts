"use client";

import { toast } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { cartApi } from "../api/cartApi";
import { CART_QUERY_KEY } from "../constants/cart.constants";

export const useRemoveCoupon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cartApi.removeCoupon(),
    onSuccess: (cart) => queryClient.setQueryData(CART_QUERY_KEY, cart),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
