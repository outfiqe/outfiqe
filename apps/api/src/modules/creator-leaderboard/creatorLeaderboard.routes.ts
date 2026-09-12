import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { creatorLeaderboardController } from "./creatorLeaderboard.controller.js";
import {
  creatorLeaderboardCategoryParamSchema,
  listCreatorLeaderboardQuerySchema,
  updateCreatorLeaderboardCategorySchema,
} from "./creatorLeaderboard.schemas.js";

const requireGamificationMutationAdmin = [
  ...requirePlatformRole("platform:gamification:manage"),
  requirePlatformNavItem("gamification"),
];

export const creatorLeaderboardRoutes = Router();

creatorLeaderboardRoutes.get("/categories", creatorLeaderboardController.listCategories);

creatorLeaderboardRoutes.get(
  "/",
  validate({ query: listCreatorLeaderboardQuerySchema }),
  creatorLeaderboardController.listCreators,
);

creatorLeaderboardRoutes.patch(
  "/categories/:category",
  ...requireGamificationMutationAdmin,
  validate({
    params: creatorLeaderboardCategoryParamSchema,
    body: updateCreatorLeaderboardCategorySchema,
  }),
  creatorLeaderboardController.updateCategory,
);
