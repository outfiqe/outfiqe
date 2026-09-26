import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { creatorCompetitionController } from "./creatorCompetition.controller.js";
import {
  createCreatorCompetitionSchema,
  creatorCompetitionIdParamSchema,
  updateCreatorCompetitionSchema,
} from "./creatorCompetition.schemas.js";

const requireGamificationRead = [
  ...requirePlatformRole("platform:gamification:read", "platform:gamification:manage"),
  requirePlatformNavItem("gamification"),
];
const requireGamificationMutationAdmin = [
  ...requirePlatformRole("platform:gamification:manage"),
  requirePlatformNavItem("gamification"),
];

export const creatorCompetitionRoutes = Router();

creatorCompetitionRoutes.get("/", creatorCompetitionController.listActive);

creatorCompetitionRoutes.get(
  "/admin",
  ...requireGamificationRead,
  creatorCompetitionController.listAllAdmin,
);

creatorCompetitionRoutes.post(
  "/",
  ...requireGamificationMutationAdmin,
  validate({ body: createCreatorCompetitionSchema }),
  creatorCompetitionController.create,
);

creatorCompetitionRoutes.patch(
  "/:competitionId",
  ...requireGamificationMutationAdmin,
  validate({ params: creatorCompetitionIdParamSchema, body: updateCreatorCompetitionSchema }),
  creatorCompetitionController.update,
);
