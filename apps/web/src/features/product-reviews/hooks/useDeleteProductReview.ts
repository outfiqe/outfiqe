"use client";

import { toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { productReviewsApi } from "../api/productReviewsApi";
import { productRatingSummaryQueryKey } from "./useProductRatingSummary";

export const useDeleteProductReview = (productId: string) =>
  useApiMutation({
    mutationFn: (reviewId: string) => productReviewsApi.remove(productId, reviewId),
    invalidateKeys: [["product-reviews", productId], productRatingSummaryQueryKey(productId)],
    onError: (error) => toast.error(getErrorMessage(error)),
  });
