"use client";

import { toast } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { cartApi } from "../api/cartApi";
import { CART_QUERY_KEY } from "../cart.constants";

export const useAddToCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, sizeId, qty }: { productId: string; sizeId: string; qty?: number }) =>
      cartApi.addItem(productId, sizeId, qty),
    onSuccess: (cart) => queryClient.setQueryData(CART_QUERY_KEY, cart),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
