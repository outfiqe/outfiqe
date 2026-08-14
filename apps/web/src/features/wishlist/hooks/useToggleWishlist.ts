"use client";

import { toast } from "@outfiqe/design-system";
import { useMutation } from "@tanstack/react-query";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { wishlistApi } from "../api/wishlistApi";

export const useToggleWishlist = () => {
  return useMutation({
    mutationFn: ({ productId, saved }: { productId: string; saved: boolean }) =>
      saved ? wishlistApi.unsave(productId) : wishlistApi.save(productId),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
