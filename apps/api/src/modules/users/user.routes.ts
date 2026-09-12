import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { requireActiveAuth } from "#middlewares/require-active-account.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";

import { userController } from "./user.controller.js";
import {
  createUserSchema,
  handleAvailabilityQuerySchema,
  listUsersQuerySchema,
  searchUsersQuerySchema,
  updateOwnProfileSchema,
  userIdParamSchema,
} from "./user.schemas.js";

const requireAdmin = [requireAuth, requirePlatformAccess];

const HANDLE_AVAILABILITY_WINDOW_MS = 60 * 1000;
const HANDLE_AVAILABILITY_MAX_REQUESTS = 60;

const handleAvailabilityRateLimit = rateLimit({
  namespace: "handle-availability",
  windowMs: HANDLE_AVAILABILITY_WINDOW_MS,
  max: HANDLE_AVAILABILITY_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many username checks. Please wait a moment and try again.",
});

export const userRoutes = Router();

userRoutes.post("/", ...requireAdmin, validate({ body: createUserSchema }), userController.create);
userRoutes.patch(
  "/me",
  ...requireActiveAuth,
  validate({ body: updateOwnProfileSchema }),
  userController.updateMe,
);
userRoutes.get(
  "/handle-availability",
  requireAuth,
  handleAvailabilityRateLimit,
  validate({ query: handleAvailabilityQuerySchema }),
  userController.checkHandleAvailability,
);
userRoutes.get(
  "/",
  ...requireAdmin,
  validate({ query: listUsersQuerySchema }),
  userController.list,
);
userRoutes.get(
  "/search",
  ...requireAdmin,
  validate({ query: searchUsersQuerySchema }),
  userController.search,
);
userRoutes.get(
  "/:id",
  ...requireAdmin,
  validate({ params: userIdParamSchema }),
  userController.get,
);
