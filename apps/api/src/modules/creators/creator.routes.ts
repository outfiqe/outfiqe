import { Router } from "express";

import { rateLimitHandleChangesOnly } from "#middlewares/handle-change-rate-limit.js";
import { optionalAuth } from "#middlewares/optional-auth.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

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

export const creatorRoutes = Router();

creatorRoutes.post("/apply", requireAuth, creatorController.apply);
creatorRoutes.get("/me", requireAuth, creatorController.me);
creatorRoutes.patch(
  "/me",
  requireAuth,
  rateLimitHandleChangesOnly,
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
  ...platformGuards.creatorsRead,
  validate({ query: listCreatorsQuerySchema }),
  creatorController.list,
);
creatorRoutes.post(
  "/:userId/approve",
  ...platformGuards.creatorsManage,
  validate({ params: creatorUserIdParamSchema }),
  creatorController.approve,
);
creatorRoutes.post(
  "/:userId/reject",
  ...platformGuards.creatorsManage,
  validate({ params: creatorUserIdParamSchema }),
  creatorController.reject,
);
