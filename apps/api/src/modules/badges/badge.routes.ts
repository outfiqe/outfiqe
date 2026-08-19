import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { badgeController } from "./badge.controller.js";
import {
  badgeIdParamSchema,
  updateBadgeDisplaySchema,
  updateFeaturedBadgesSchema,
} from "./badge.schemas.js";

export const badgeRoutes = Router();

badgeRoutes.get("/collection", requireAuth, badgeController.listMyCollection);

badgeRoutes.patch(
  "/:badgeId/display",
  requireAuth,
  validate({ params: badgeIdParamSchema, body: updateBadgeDisplaySchema }),
  badgeController.updateDisplay,
);

badgeRoutes.patch(
  "/featured",
  requireAuth,
  validate({ body: updateFeaturedBadgesSchema }),
  badgeController.updateFeatured,
);
