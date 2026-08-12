import { Router } from "express";

import { creatorController } from "./creator.controller.js";
import {
  creatorHandleParamSchema,
  creatorUserIdParamSchema,
  listCreatorLooksQuerySchema,
  listCreatorsQuerySchema,
  updateCreatorProfileSchema,
} from "./creator.schemas.js";

import { optionalAuth } from "../../shared/middlewares/optional-auth.js";
import { requireAuth } from "../../shared/middlewares/require-auth.js";
import { requireRole } from "../../shared/middlewares/require-role.js";
import { validate } from "../../shared/middlewares/validate.js";

import { UserRole } from "../../generated/prisma/enums.js";

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

export const creatorRoutes = Router();

creatorRoutes.post("/apply", requireAuth, creatorController.apply);
creatorRoutes.get("/me", requireAuth, creatorController.me);
creatorRoutes.patch(
  "/me",
  requireAuth,
  validate({ body: updateCreatorProfileSchema }),
  creatorController.updateMe,
);
creatorRoutes.get(
  "/by-handle/:handle",
  optionalAuth,
  validate({ params: creatorHandleParamSchema }),
  creatorController.getPublicByHandle,
);
creatorRoutes.get(
  "/by-handle/:handle/looks",
  optionalAuth,
  validate({ params: creatorHandleParamSchema, query: listCreatorLooksQuerySchema }),
  creatorController.listLooksByHandle,
);
creatorRoutes.get(
  "/",
  ...requireAdmin,
  validate({ query: listCreatorsQuerySchema }),
  creatorController.list,
);
creatorRoutes.post(
  "/:userId/approve",
  ...requireAdmin,
  validate({ params: creatorUserIdParamSchema }),
  creatorController.approve,
);
creatorRoutes.post(
  "/:userId/reject",
  ...requireAdmin,
  validate({ params: creatorUserIdParamSchema }),
  creatorController.reject,
);
