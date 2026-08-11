import { Router } from "express";
import { validate } from "../../shared/middlewares/validate.js";
import { createUserSchema, userIdParamSchema } from "./user.schemas.js";
import { userController } from "./user.controller.js";

import { requireAuth } from "../../shared/middlewares/require-auth.js";
import { requireRole } from "../../shared/middlewares/require-role.js";

import { UserRole } from "../../generated/prisma/enums.js";

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

export const userRoutes = Router();

userRoutes.post("/", validate({ body: createUserSchema }), userController.create);
userRoutes.get("/", ...requireAdmin, userController.list);
userRoutes.get(
  "/:id",
  ...requireAdmin,
  validate({ params: userIdParamSchema }),
  userController.get,
);
