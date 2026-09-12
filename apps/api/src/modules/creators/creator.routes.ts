import type { NextFunction, Request, Response } from "express";
import { Router } from "express";

import { optionalAuth } from "#middlewares/optional-auth.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";

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

const requireAdmin = [requireAuth, requirePlatformAccess];

const HANDLE_CHANGE_WINDOW_MS = 24 * 60 * 60 * 1000;
const HANDLE_CHANGE_MAX_REQUESTS = 10;

const handleChangeRateLimit = rateLimit({
  namespace: "handle-change",
  windowMs: HANDLE_CHANGE_WINDOW_MS,
  max: HANDLE_CHANGE_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many username changes. Please wait a moment and try again.",
});

const rateLimitHandleChangesOnly = (req: Request, res: Response, next: NextFunction) => {
  if (typeof req.body !== "object" || req.body === null || req.body.handle === undefined) {
    return next();
  }
  return handleChangeRateLimit(req, res, next);
};

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
