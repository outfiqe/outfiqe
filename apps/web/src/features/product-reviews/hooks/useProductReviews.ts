"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { productReviewsApi } from "../api/productReviewsApi";
import type { ReviewSort } from "../api/productReviewSchemas";
import { productReviewsQueryKey } from "../product-reviews.constants";

export const useProductReviews = (
  productId: string,
  sort: ReviewSort,
  rating: number | undefined,
) => {
  return useInfiniteCursorPage(productReviewsQueryKey(productId, sort, rating), (cursor) =>
    productReviewsApi.list(productId, { sort, rating, cursor }),
  );
};
