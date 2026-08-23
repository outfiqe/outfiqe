import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { getAuthPrincipal, requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  ListProductReviewsQuery,
  ProductIdParam,
  ReviewIdParam,
  WriteProductReviewBody,
} from "./product-review.schemas.js";
import { productReviewService } from "./product-review.service.js";

const CREATED_STATUS = 201;

export const productReviewController = {
  async list(_req: Request, res: Response) {
    const { productId } = validated.params<ProductIdParam>(res);
    const query = validated.query<ListProductReviewsQuery>(res);
    const viewerId = getAuthPrincipal(res)?.userId;

    const page = await productReviewService.list(productId, viewerId, query);
    sendSuccess(res, page, "Reviews.");
  },

  async create(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { productId } = validated.params<ProductIdParam>(res);
    const body = validated.body<WriteProductReviewBody>(res);

    const review = await productReviewService.create(productId, userId, body);
    sendSuccess(res, review, "Review posted.", CREATED_STATUS);
  },

  async update(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { productId, reviewId } = validated.params<ReviewIdParam>(res);
    const body = validated.body<WriteProductReviewBody>(res);

    const review = await productReviewService.update(productId, reviewId, userId, body);
    sendSuccess(res, review, "Review updated.");
  },

  async remove(_req: Request, res: Response) {
    const principal = requireAuthPrincipal(res);
    const { productId, reviewId } = validated.params<ReviewIdParam>(res);

    await productReviewService.remove(productId, reviewId, principal);
    sendSuccess(res, null, "Review deleted.");
  },

  async markHelpful(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { productId, reviewId } = validated.params<ReviewIdParam>(res);

    const result = await productReviewService.markHelpful(productId, reviewId, userId);
    sendSuccess(res, result, "Marked helpful.");
  },

  async unmarkHelpful(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { productId, reviewId } = validated.params<ReviewIdParam>(res);

    const result = await productReviewService.unmarkHelpful(productId, reviewId, userId);
    sendSuccess(res, result, "Unmarked helpful.");
  },
};
