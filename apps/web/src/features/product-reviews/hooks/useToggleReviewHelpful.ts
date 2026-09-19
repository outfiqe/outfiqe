"use client";

import { toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { productReviewsApi } from "../api/productReviewsApi";

export const useToggleReviewHelpful = (productId: string) =>
  useApiMutation({
    mutationFn: ({ reviewId, hasVotedHelpful }: { reviewId: string; hasVotedHelpful: boolean }) =>
      hasVotedHelpful
        ? productReviewsApi.unmarkHelpful(productId, reviewId)
        : productReviewsApi.markHelpful(productId, reviewId),
    invalidateKeys: [["product-reviews", productId]],
    onError: (error) => toast.error(getErrorMessage(error)),
  });
