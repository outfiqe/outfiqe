"use client";

import { toast } from "@outfiqe/design-system";
import { ANALYTICS_EVENTS } from "@outfiqe/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { trackEvent } from "@/features/analytics/utils/analyticsClient";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { wishlistApi } from "../api/wishlistApi";
import { STASH_STATE_PRODUCT_QUERY_ROOTS } from "../constants/wishlist.constants";

export const useToggleWishlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, saved }: { productId: string; saved: boolean }) =>
      saved ? wishlistApi.unsave(productId) : wishlistApi.save(productId),
    onSuccess: (_, { productId, saved: wasSaved }) => {
      if (!wasSaved) trackEvent(ANALYTICS_EVENTS.WISHLIST_ITEM_ADD, { product_id: productId });
      return Promise.all(
        STASH_STATE_PRODUCT_QUERY_ROOTS.map((queryRoot) =>
          queryClient.invalidateQueries({ queryKey: [queryRoot] }),
        ),
      );
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
