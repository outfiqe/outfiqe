"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CART_QUERY_KEY } from "@/features/cart";

import { type AddBuildToCartInput, outfitApi } from "../api/outfitApi";

export const useBuyFromBuild = (outfitId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddBuildToCartInput) => outfitApi.addToCart(outfitId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY }),
  });
};
