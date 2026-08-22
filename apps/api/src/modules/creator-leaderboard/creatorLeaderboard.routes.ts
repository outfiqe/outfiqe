import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { creatorLeaderboardController } from "./creatorLeaderboard.controller.js";
import {
  creatorLeaderboardCategoryParamSchema,
  listCreatorLeaderboardQuerySchema,
  updateCreatorLeaderboardCategorySchema,
} from "./creatorLeaderboard.schemas.js";

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

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
