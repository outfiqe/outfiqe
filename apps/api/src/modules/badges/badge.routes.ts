import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { badgeController } from "./badge.controller.js";
import {
  awardBadgeSchema,
  badgeIdParamSchema,
  createBadgeSchema,
  removeUserBadgeSchema,
  updateBadgeDisplaySchema,
  updateBadgeSchema,
  updateFeaturedBadgesSchema,
  updateTitleBadgeSchema,
  userBadgeIdParamSchema,
} from "./badge.schemas.js";

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

export const badgeRoutes = Router();

badgeRoutes.get("/collection", requireAuth, badgeController.listMyCollection);

badgeRoutes.get("/admin", ...requireAdmin, badgeController.listAllAdmin);

badgeRoutes.get("/stats", ...requireAdmin, badgeController.getAdminStats);

badgeRoutes.get("/user-badges/manual", ...requireAdmin, badgeController.listManualAwards);

badgeRoutes.post(
  "/",
  ...requireAdmin,
  validate({ body: createBadgeSchema }),
  badgeController.create,
);

badgeRoutes.patch(
  "/featured",
  requireAuth,
  validate({ body: updateFeaturedBadgesSchema }),
  badgeController.updateFeatured,
);

badgeRoutes.patch(
  "/title",
  requireAuth,
  validate({ body: updateTitleBadgeSchema }),
  badgeController.updateTitle,
);

badgeRoutes.post(
  "/user-badges/:userBadgeId/remove",
  ...requireAdmin,
  validate({ params: userBadgeIdParamSchema, body: removeUserBadgeSchema }),
  badgeController.removeUserBadge,
);

badgeRoutes.patch(
  "/:badgeId/display",
  requireAuth,
  validate({ params: badgeIdParamSchema, body: updateBadgeDisplaySchema }),
  badgeController.updateDisplay,
);

badgeRoutes.patch(
  "/:badgeId",
  ...requireAdmin,
  validate({ params: badgeIdParamSchema, body: updateBadgeSchema }),
  badgeController.update,
);

badgeRoutes.post(
  "/:badgeId/award",
  ...requireAdmin,
  validate({ params: badgeIdParamSchema, body: awardBadgeSchema }),
  badgeController.award,
);
