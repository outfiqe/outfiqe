"use client";

import { useMutation } from "@tanstack/react-query";

import { wishlistApi } from "../api/wishlistApi";

export const useToggleWishlist = () => {
  return useMutation({
    mutationFn: ({ productId, saved }: { productId: string; saved: boolean }) =>
      saved ? wishlistApi.unsave(productId) : wishlistApi.save(productId),
  });
};
