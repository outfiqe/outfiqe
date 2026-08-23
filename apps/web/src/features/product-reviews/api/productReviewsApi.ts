import { apiClient } from "@/shared/lib/apiClient";

import {
  type HelpfulVoteResult,
  helpfulVoteResultSchema,
  type ProductReview,
  type ProductReviewPage,
  productReviewPageSchema,
  productReviewSchema,
  type ReviewSort,
} from "./productReviewSchemas";

export type WriteProductReviewInput = {
  rating: number;
  title?: string;
  body: string;
  imageUrls?: string[];
};

type ListProductReviewsParams = {
  sort?: ReviewSort;
  rating?: number;
  cursor?: string;
};

export const productReviewsApi = {
  async list(
    productId: string,
    { sort, rating, cursor }: ListProductReviewsParams = {},
  ): Promise<ProductReviewPage> {
    const query = new URLSearchParams();
    if (sort) query.set("sort", sort);
    if (rating) query.set("rating", String(rating));
    if (cursor) query.set("cursor", cursor);

    const res = await apiClient.get<ProductReviewPage>(
      `/products/${productId}/reviews?${query.toString()}`,
    );
    return productReviewPageSchema.parse(res.data);
  },

  async create(productId: string, input: WriteProductReviewInput): Promise<ProductReview> {
    const res = await apiClient.post<ProductReview>(`/products/${productId}/reviews`, input);
    return productReviewSchema.parse(res.data);
  },

  async update(
    productId: string,
    reviewId: string,
    input: WriteProductReviewInput,
  ): Promise<ProductReview> {
    const res = await apiClient.patch<ProductReview>(
      `/products/${productId}/reviews/${reviewId}`,
      input,
    );
    return productReviewSchema.parse(res.data);
  },

  async remove(productId: string, reviewId: string): Promise<void> {
    await apiClient.del(`/products/${productId}/reviews/${reviewId}`);
  },

  async markHelpful(productId: string, reviewId: string): Promise<HelpfulVoteResult> {
    const res = await apiClient.post<HelpfulVoteResult>(
      `/products/${productId}/reviews/${reviewId}/helpful`,
    );
    return helpfulVoteResultSchema.parse(res.data);
  },

  async unmarkHelpful(productId: string, reviewId: string): Promise<HelpfulVoteResult> {
    const res = await apiClient.del<HelpfulVoteResult>(
      `/products/${productId}/reviews/${reviewId}/helpful`,
    );
    return helpfulVoteResultSchema.parse(res.data);
  },
};
