import { Router } from "express";

import { optionalAuth } from "#middlewares/optional-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { challengeController } from "./challenge.controller.js";
import {
  challengeIdParamSchema,
  createChallengeSchema,
  updateChallengeSchema,
} from "./challenge.schemas.js";

const requireGamificationRead = [
  ...requirePlatformRole("platform:gamification:read", "platform:gamification:manage"),
  requirePlatformNavItem("gamification"),
];
const requireGamificationMutationAdmin = [
  ...requirePlatformRole("platform:gamification:manage"),
  requirePlatformNavItem("gamification"),
];

export const challengeRoutes = Router();

challengeRoutes.get("/admin", ...requireGamificationRead, challengeController.listAllAdmin);

challengeRoutes.get("/", optionalAuth, challengeController.listActive);

challengeRoutes.post(
  "/",
  ...requireGamificationMutationAdmin,
  validate({ body: createChallengeSchema }),
  challengeController.create,
);

challengeRoutes.get(
  "/:challengeId",
  optionalAuth,
  validate({ params: challengeIdParamSchema }),
  challengeController.getActive,
);

challengeRoutes.patch(
  "/:challengeId",
  ...requireGamificationMutationAdmin,
  validate({ params: challengeIdParamSchema, body: updateChallengeSchema }),
  challengeController.update,
);
