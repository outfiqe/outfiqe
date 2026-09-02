import { Router } from "express";

import { optionalAuth } from "#middlewares/optional-auth.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { challengeController } from "./challenge.controller.js";
import {
  challengeIdParamSchema,
  createChallengeSchema,
  updateChallengeSchema,
} from "./challenge.schemas.js";

const requireAdmin = [requireAuth, requirePlatformAccess, requirePlatformNavItem("gamification")];

export const challengeRoutes = Router();

challengeRoutes.get("/admin", ...requireAdmin, challengeController.listAllAdmin);

challengeRoutes.get("/", optionalAuth, challengeController.listActive);

challengeRoutes.post(
  "/",
  ...requireAdmin,
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
  ...requireAdmin,
  validate({ params: challengeIdParamSchema, body: updateChallengeSchema }),
  challengeController.update,
);
