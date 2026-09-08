import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";

import { tagReviewController } from "./tagReview.controller.js";
import {
  approveTagSchema,
  listTagReviewsQuerySchema,
  rejectTagSchema,
  tagReviewIdParamSchema,
} from "./tagReview.schemas.js";

const REVIEW_WINDOW_MS = 60 * 60 * 1000;
const REVIEW_MAX_REQUESTS = 300;

const reviewRateLimit = rateLimit({
  namespace: "tag-review-write",
  windowMs: REVIEW_WINDOW_MS,
  max: REVIEW_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many tag reviews at once. Please slow down.",
});

const requireBrandOwner = [requireAuth, requireRole(UserRole.BRAND_OWNER)];

export const tagReviewRoutes = Router();

tagReviewRoutes.get("/metrics", requireAuth, requirePlatformAccess, tagReviewController.metrics);

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
