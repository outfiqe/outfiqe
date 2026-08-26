import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";

import { creatorLeaderboardController } from "./creatorLeaderboard.controller.js";
import {
  creatorLeaderboardCategoryParamSchema,
  listCreatorLeaderboardQuerySchema,
  updateCreatorLeaderboardCategorySchema,
} from "./creatorLeaderboard.schemas.js";

const requireAdmin = [requireAuth, requirePlatformAccess];

export const creatorLeaderboardRoutes = Router();

creatorLeaderboardRoutes.get("/categories", creatorLeaderboardController.listCategories);

creatorLeaderboardRoutes.get(
  "/",
  validate({ query: listCreatorLeaderboardQuerySchema }),
  creatorLeaderboardController.listCreators,
);

creatorLeaderboardRoutes.patch(
  "/categories/:category",
  ...requireAdmin,
  validate({
    params: creatorLeaderboardCategoryParamSchema,
    body: updateCreatorLeaderboardCategorySchema,
  }),
  creatorLeaderboardController.updateCategory,
);
