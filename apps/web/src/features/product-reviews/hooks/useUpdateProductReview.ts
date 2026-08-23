"use client";

import { toast } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { productReviewsApi, type WriteProductReviewInput } from "../api/productReviewsApi";
import { productRatingSummaryQueryKey } from "./useProductRatingSummary";

export const useUpdateProductReview = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, input }: { reviewId: string; input: WriteProductReviewInput }) =>
      productReviewsApi.update(productId, reviewId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
      void queryClient.invalidateQueries({ queryKey: productRatingSummaryQueryKey(productId) });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
