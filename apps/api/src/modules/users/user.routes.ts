import { Router } from "express";

import { rateLimitHandleChangesOnly } from "#middlewares/handle-change-rate-limit.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { requireActiveAuth } from "#middlewares/require-active-account.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { userController } from "./user.controller.js";
import {
  createUserSchema,
  handleAvailabilityQuerySchema,
  listUsersQuerySchema,
  searchUsersQuerySchema,
  updateOwnProfileSchema,
  userIdParamSchema,
} from "./user.schemas.js";

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

userRoutes.post(
  "/",
  ...platformGuards.usersManage,
  validate({ body: createUserSchema }),
  userController.create,
);
userRoutes.patch(
  "/me",
  ...requireActiveAuth,
  rateLimitHandleChangesOnly,
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
  ...platformGuards.usersRead,
  validate({ query: listUsersQuerySchema }),
  userController.list,
);
userRoutes.get(
  "/search",
  ...platformGuards.userSearch,
  validate({ query: searchUsersQuerySchema }),
  userController.search,
);
userRoutes.get(
  "/:id",
  ...platformGuards.usersRead,
  validate({ params: userIdParamSchema }),
  userController.get,
);
