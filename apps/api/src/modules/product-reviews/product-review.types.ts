import type { REVIEW_SORT_VALUES } from "./product-review.constants.js";

export type ReviewSort = (typeof REVIEW_SORT_VALUES)[number];

export type ReviewAuthor = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
};

export type ProductReviewRow = {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  body: string;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
  user: ReviewAuthor;
  images: { url: string }[];
};

export type ProductReviewRecord = {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  body: string;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
  author: ReviewAuthor;
  images: string[];
  hasVotedHelpful: boolean;
};

export type ProductReviewPage = {
  reviews: ProductReviewRecord[];
  nextCursor: string | null;
};

export type ListProductReviewsParams = {
  rating?: number;
  sort: ReviewSort;
  cursor?: string;
  limit: number;
};

export type CreateProductReviewInput = {
  productId: string;
  userId: string;
  rating: number;
  title?: string;
  body: string;
  imageUrls: string[];
};

export type UpdateProductReviewInput = {
  rating: number;
  title?: string;
  body: string;
  imageUrls?: string[];
};
