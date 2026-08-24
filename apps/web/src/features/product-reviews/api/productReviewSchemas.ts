import { z } from "zod";

export const reviewSortSchema = z.enum([
  "newest",
  "oldest",
  "highest_rating",
  "lowest_rating",
  "most_helpful",
]);
export type ReviewSort = z.infer<typeof reviewSortSchema>;

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
  updatedAt: z.string(),
  author: reviewAuthorSchema,
  images: z.array(z.string()),
  hasVotedHelpful: z.boolean(),
});
export type ProductReview = z.infer<typeof productReviewSchema>;

export const productReviewPageSchema = z.object({
  reviews: z.array(productReviewSchema),
  nextCursor: z.string().nullable(),
});
export type ProductReviewPage = z.infer<typeof productReviewPageSchema>;

export const helpfulVoteResultSchema = z.object({ helpfulCount: z.number() });
export type HelpfulVoteResult = z.infer<typeof helpfulVoteResultSchema>;
