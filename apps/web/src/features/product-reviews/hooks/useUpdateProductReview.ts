"use client";

import { toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { productReviewsApi, type WriteProductReviewInput } from "../api/productReviewsApi";
import { productRatingSummaryQueryKey } from "./useProductRatingSummary";

export const useUpdateProductReview = (productId: string) =>
  useApiMutation({
    mutationFn: ({ reviewId, input }: { reviewId: string; input: WriteProductReviewInput }) =>
      productReviewsApi.update(productId, reviewId, input),
    invalidateKeys: [["product-reviews", productId], productRatingSummaryQueryKey(productId)],
    onError: (error) => toast.error(getErrorMessage(error)),
  });
