import { Router } from "express";

import { optionalAuth } from "#middlewares/optional-auth.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import {
  HELPFUL_VOTE_RATE_LIMIT_MAX_REQUESTS,
  HELPFUL_VOTE_RATE_LIMIT_WINDOW_MS,
  REVIEW_RATE_LIMIT_MAX_REQUESTS,
  REVIEW_RATE_LIMIT_WINDOW_MS,
} from "./product-review.constants.js";
import { productReviewController } from "./product-review.controller.js";
import {
  listProductReviewsQuerySchema,
  productIdParamSchema,
  reviewIdParamSchema,
  writeProductReviewSchema,
} from "./product-review.schemas.js";

const writeReviewRateLimit = rateLimit({
  namespace: "product-review-write",
  windowMs: REVIEW_RATE_LIMIT_WINDOW_MS,
  max: REVIEW_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
});

const helpfulVoteRateLimit = rateLimit({
  namespace: "product-review-helpful-vote",
  windowMs: HELPFUL_VOTE_RATE_LIMIT_WINDOW_MS,
  max: HELPFUL_VOTE_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
});

export const productReviewRoutes = Router({ mergeParams: true });

productReviewRoutes.get(
  "/",
  optionalAuth,
  validate({ params: productIdParamSchema, query: listProductReviewsQuerySchema }),
  productReviewController.list,
);
productReviewRoutes.post(
  "/",
  requireAuth,
  writeReviewRateLimit,
  validate({ params: productIdParamSchema, body: writeProductReviewSchema }),
  productReviewController.create,
);
productReviewRoutes.patch(
  "/:reviewId",
  requireAuth,
  validate({ params: reviewIdParamSchema, body: writeProductReviewSchema }),
  productReviewController.update,
);
productReviewRoutes.delete(
  "/:reviewId",
  requireAuth,
  validate({ params: reviewIdParamSchema }),
  productReviewController.remove,
);

productReviewRoutes.post(
  "/:reviewId/helpful",
  requireAuth,
  helpfulVoteRateLimit,
  validate({ params: reviewIdParamSchema }),
  productReviewController.markHelpful,
);
productReviewRoutes.delete(
  "/:reviewId/helpful",
  requireAuth,
  validate({ params: reviewIdParamSchema }),
  productReviewController.unmarkHelpful,
);
