import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";

import { userController } from "./user.controller.js";
import {
  createUserSchema,
  searchUsersQuerySchema,
  updateOwnProfileSchema,
  userIdParamSchema,
} from "./user.schemas.js";

const requireAdmin = [requireAuth, requirePlatformAccess];

export const userRoutes = Router();

userRoutes.post("/", validate({ body: createUserSchema }), userController.create);
userRoutes.patch(
  "/me",
  requireAuth,
  validate({ body: updateOwnProfileSchema }),
  userController.updateMe,
);
userRoutes.get("/", ...requireAdmin, userController.list);
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
