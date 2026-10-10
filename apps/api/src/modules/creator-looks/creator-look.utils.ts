import type { PostLayout, TagRejectionReason } from "#generated/prisma/enums.js";
import { TagReviewStatus } from "#generated/prisma/enums.js";

import { MAX_TAG_RE_REQUESTS } from "./creator-look.constants.js";
import type {
  CreatorLookEditDetail,
  CreatorLookFeedPost,
  CreatorLookSummary,
  PostSuggestion,
} from "./creator-look.types.js";

export const toSuggestion = ({
  id,
  imageUrl,
  caption,
  creator,
}: CreatorLookFeedPost): PostSuggestion => ({
  id,
  imageUrl,
  caption,
  creator: { name: creator.name, handle: creator.handle },
});

export const toSummary = ({
  id,
  creatorId,
  imageUrl,
  layout,
  caption,
  createdAt,
  taggedProducts,
}: {
  id: string;
  creatorId: string;
  imageUrl: string;
  layout: PostLayout;
  caption: string | null;
  createdAt: Date;
} & {
  taggedProducts: { product: { id: string; name: string; imageUrl: string | null } }[];
}): CreatorLookSummary => ({
  id,
  creatorId,
  imageUrl,
  layout,
  caption,
  createdAt,
  taggedProducts: taggedProducts.map((tagged) => tagged.product),
});

export const toEditDetail = ({
  id,
  imageUrl,
  images,
  layout,
  caption,
  taggedProducts,
}: {
  id: string;
  imageUrl: string;
  images: { url: string }[];
  layout: PostLayout;
  caption: string | null;
  taggedProducts: {
    productId: string;
    sizeWorn: string | null;
    reviewStatus: TagReviewStatus;
    rejectionReason: TagRejectionReason | null;
    rejectionNote: string | null;
    reRequestCount: number;
    product: {
      id: string;
      name: string;
      price: number;
      imageUrl: string | null;
      brand: { name: string };
    };
  }[];
}): CreatorLookEditDetail => ({
  id,
  imageUrls: images.length > 0 ? images.map((image) => image.url) : [imageUrl],
  layout,
  caption,
  taggedProducts: taggedProducts.map(
    ({
      productId,
      sizeWorn,
      reviewStatus,
      rejectionReason,
      rejectionNote,
      reRequestCount,
      product,
    }) => ({
      productId,
      sizeWorn: sizeWorn ?? "",
      reviewStatus,
      rejectionReason,
      rejectionNote,
      canReRequest:
        reviewStatus === TagReviewStatus.REJECTED && reRequestCount < MAX_TAG_RE_REQUESTS,
      product: {
        id: product.id,
        name: product.name,
        brand: product.brand.name,
        price: product.price,
        imageUrl: product.imageUrl,
      },
    }),
  ),
});

export type SimpleCursor = { c: string; i: string };
export type TrendingSnapshotCursor = { sessionId: string; offset: number };
export type FeaturedLookCursor = { e: number; i: string };
export type SearchLooksCursor = { offset: number };
