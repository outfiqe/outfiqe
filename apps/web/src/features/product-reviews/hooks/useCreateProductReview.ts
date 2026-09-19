"use client";

import { toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { productReviewsApi, type WriteProductReviewInput } from "../api/productReviewsApi";
import { productRatingSummaryQueryKey } from "./useProductRatingSummary";

export const useCreateProductReview = (productId: string) =>
  useApiMutation({
    mutationFn: (input: WriteProductReviewInput) => productReviewsApi.create(productId, input),
    invalidateKeys: [["product-reviews", productId], productRatingSummaryQueryKey(productId)],
    onError: (error) => toast.error(getErrorMessage(error)),
  });
