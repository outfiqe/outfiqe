"use client";

import { toast } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { productReviewsApi } from "../api/productReviewsApi";

export const useToggleReviewHelpful = (productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, hasVotedHelpful }: { reviewId: string; hasVotedHelpful: boolean }) =>
      hasVotedHelpful
        ? productReviewsApi.unmarkHelpful(productId, reviewId)
        : productReviewsApi.markHelpful(productId, reviewId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
