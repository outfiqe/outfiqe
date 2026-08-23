import type { ReviewSort } from "./api/productReviewSchemas";

export const MAX_REVIEW_IMAGES = 5;
export const REVIEW_BODY_MIN_LENGTH = 10;

export const productReviewsQueryKey = (
  productId: string,
  sort: ReviewSort,
  rating: number | undefined,
) => ["product-reviews", productId, sort, rating] as const;
