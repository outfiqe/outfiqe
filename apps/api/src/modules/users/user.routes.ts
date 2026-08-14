import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { userController } from "./user.controller.js";
import { createUserSchema, updateOwnProfileSchema, userIdParamSchema } from "./user.schemas.js";

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

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
  "/:id",
  ...requireAdmin,
  validate({ params: userIdParamSchema }),
  userController.get,
);
