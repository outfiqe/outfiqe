import { millisecondsInHour } from "date-fns/constants";
import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { tagReviewController } from "./tag-review.controller.js";
import {
  approveTagSchema,
  listMetricTagsQuerySchema,
  listTagReviewsQuerySchema,
  rejectTagSchema,
  tagReviewIdParamSchema,
} from "./tag-review.schemas.js";

const REVIEW_RATE_LIMIT_NAMESPACE = "tag-review-write";
const REVIEW_WINDOW_MS = millisecondsInHour;
const REVIEW_MAX_REQUESTS = 300;
const REVIEW_RATE_LIMIT_MESSAGE = "Too many tag reviews at once. Please slow down.";

const reviewRateLimit = rateLimit({
  namespace: REVIEW_RATE_LIMIT_NAMESPACE,
  windowMs: REVIEW_WINDOW_MS,
  max: REVIEW_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: REVIEW_RATE_LIMIT_MESSAGE,
});

const requireBrandOwner = [requireAuth, requireRole(UserRole.BRAND_OWNER)];

export const tagReviewRoutes = Router();

tagReviewRoutes.get("/metrics", ...platformGuards.reviewsModerate, tagReviewController.metrics);

tagReviewRoutes.get(
  "/metrics/tags",
  ...platformGuards.reviewsModerate,
  validate({ query: listMetricTagsQuerySchema }),
  tagReviewController.metricTags,
);

tagReviewRoutes.get("/pending-count", ...requireBrandOwner, tagReviewController.pendingCount);

tagReviewRoutes.get(
  "/",
  ...requireBrandOwner,
  validate({ query: listTagReviewsQuerySchema }),
  tagReviewController.list,
);

tagReviewRoutes.post(
  "/:id/approve",
  ...requireBrandOwner,
  reviewRateLimit,
  validate({ params: tagReviewIdParamSchema, body: approveTagSchema }),
  tagReviewController.approve,
);

tagReviewRoutes.post(
  "/:id/reject",
  ...requireBrandOwner,
  reviewRateLimit,
  validate({ params: tagReviewIdParamSchema, body: rejectTagSchema }),
  tagReviewController.reject,
);
