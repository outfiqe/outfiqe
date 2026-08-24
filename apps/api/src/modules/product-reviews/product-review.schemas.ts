import { z } from "zod";

import { PRODUCT_RATING_MAX, PRODUCT_RATING_MIN } from "#modules/products/product.constants.js";

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_REVIEW_IMAGES,
  REVIEW_BODY_MAX,
  REVIEW_BODY_MIN,
  REVIEW_SORT_VALUES,
  REVIEW_TITLE_MAX,
} from "./product-review.constants.js";

export const reviewSortSchema = z.enum(REVIEW_SORT_VALUES);

export const productIdParamSchema = z.object({ productId: z.uuid() });
export const reviewIdParamSchema = productIdParamSchema.extend({ reviewId: z.uuid() });

export const writeProductReviewSchema = z.object({
  rating: z.number().int().min(PRODUCT_RATING_MIN).max(PRODUCT_RATING_MAX),
  title: z.string().trim().max(REVIEW_TITLE_MAX).optional(),
  body: z.string().trim().min(REVIEW_BODY_MIN).max(REVIEW_BODY_MAX),
  imageUrls: z.array(z.url()).max(MAX_REVIEW_IMAGES).optional(),
});

export const listProductReviewsQuerySchema = z.object({
  rating: z.coerce.number().int().min(PRODUCT_RATING_MIN).max(PRODUCT_RATING_MAX).optional(),
  sort: reviewSortSchema.default("newest"),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type ProductIdParam = z.infer<typeof productIdParamSchema>;
export type ReviewIdParam = z.infer<typeof reviewIdParamSchema>;
export type WriteProductReviewBody = z.infer<typeof writeProductReviewSchema>;
export type ListProductReviewsQuery = z.infer<typeof listProductReviewsQuerySchema>;
