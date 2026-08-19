import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { optionalAuth } from "#middlewares/optional-auth.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { creatorController } from "./creator.controller.js";
import {
  autocompleteQuerySchema,
  creatorHandleParamSchema,
  creatorUserIdParamSchema,
  listCreatorLooksQuerySchema,
  listCreatorsQuerySchema,
  searchCreatorsQuerySchema,
  updateCreatorProfileSchema,
} from "./creator.schemas.js";

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
  "/autocomplete",
  validate({ query: autocompleteQuerySchema }),
  creatorController.autocomplete,
);
creatorRoutes.get(
  "/search",
  validate({ query: searchCreatorsQuerySchema }),
  creatorController.search,
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
