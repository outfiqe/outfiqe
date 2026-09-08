import { toResponsiveImage } from "#lib/responsive-image.utils.js";

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
  images: images.map((image) => toResponsiveImage(image.url, image.imageAsset)),
  hasVotedHelpful: votedReviewIds.has(id),
});
