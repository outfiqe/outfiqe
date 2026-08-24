import { z } from "zod";

export const productSuggestionSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string(),
  imageUrl: z.string().nullable(),
});
export type ProductSuggestion = z.infer<typeof productSuggestionSchema>;

export const reviewAuthorSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  avatarUrl: z.string().nullable(),
});

export const productReviewSchema = z.object({
  id: z.string(),
  productId: z.string(),
  rating: z.number(),
  title: z.string().nullable(),
  body: z.string(),
  helpfulCount: z.number(),
  createdAt: z.string(),
  author: reviewAuthorSchema,
  images: z.array(z.string()),
});
export type ProductReview = z.infer<typeof productReviewSchema>;

export const productReviewPageSchema = z.object({
  reviews: z.array(productReviewSchema),
  nextCursor: z.string().nullable(),
});
export type ProductReviewPage = z.infer<typeof productReviewPageSchema>;
