import { Router } from "express";

import { adminInviteController } from "./adminInvite.controller.js";
import { createAdminInviteSchema } from "./adminInvite.schemas.js";

import { requireAuth } from "../../shared/middlewares/require-auth.js";
import { requireRole } from "../../shared/middlewares/require-role.js";
import { validate } from "../../shared/middlewares/validate.js";

import { UserRole } from "../../generated/prisma/enums.js";

export const adminInviteRoutes = Router();

adminInviteRoutes.use(requireAuth, requireRole(UserRole.ADMIN));

adminInviteRoutes.post(
  "/",
  validate({ body: createAdminInviteSchema }),
  adminInviteController.create,
);
adminInviteRoutes.get("/", adminInviteController.list);
