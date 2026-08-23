import type { ProductReviewRecord, ProductReviewRow } from "./product-review.types.js";

export const toReviewRecord = (
  {
    id,
    productId,
    rating,
    title,
    body,
    helpfulCount,
    createdAt,
    updatedAt,
    user,
    images,
  }: ProductReviewRow,
  votedReviewIds: ReadonlySet<string>,
): ProductReviewRecord => ({
  id,
  productId,
  rating,
  title,
  body,
  helpfulCount,
  createdAt,
  updatedAt,
  author: user,
  images: images.map((image) => image.url),
  hasVotedHelpful: votedReviewIds.has(id),
});
