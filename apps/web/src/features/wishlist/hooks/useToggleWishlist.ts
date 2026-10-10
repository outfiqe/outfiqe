"use client";

import { toast } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { wishlistApi } from "../api/wishlistApi";
import { STASH_STATE_PRODUCT_QUERY_ROOTS } from "../constants/wishlist.constants";

export const useToggleWishlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, saved }: { productId: string; saved: boolean }) =>
      saved ? wishlistApi.unsave(productId) : wishlistApi.save(productId),
    onSuccess: () =>
      Promise.all(
        STASH_STATE_PRODUCT_QUERY_ROOTS.map((queryRoot) =>
          queryClient.invalidateQueries({ queryKey: [queryRoot] }),
        ),
      ),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
