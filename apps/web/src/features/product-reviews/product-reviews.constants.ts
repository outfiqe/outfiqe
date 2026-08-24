import type { ReviewSort } from "./api/productReviewSchemas";

export const MAX_REVIEW_IMAGES = 5;
export const REVIEW_BODY_MIN_LENGTH = 10;

export const RATING_STAR_QUALITY_LABEL_BY_VALUE: Record<number, string> = {
  1: "Not My Style",
  2: "Just Okay",
  3: "Good Fit",
  4: "Great Fit",
  5: "Perfect Fit",
};

export const productReviewsQueryKey = (
  productId: string,
  sort: ReviewSort,
  rating: number | undefined,
) => ["product-reviews", productId, sort, rating] as const;
