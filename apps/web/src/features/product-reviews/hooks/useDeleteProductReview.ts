"use client";

import { toast } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { productReviewsApi } from "../api/productReviewsApi";
import { productRatingSummaryQueryKey } from "./useProductRatingSummary";

export const useDeleteProductReview = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => productReviewsApi.remove(productId, reviewId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
      void queryClient.invalidateQueries({ queryKey: productRatingSummaryQueryKey(productId) });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
