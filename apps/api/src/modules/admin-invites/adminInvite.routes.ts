import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { adminInviteController } from "./adminInvite.controller.js";
import { createAdminInviteSchema } from "./adminInvite.schemas.js";

export const adminInviteRoutes = Router();

adminInviteRoutes.use(requireAuth, requireRole(UserRole.ADMIN));

adminInviteRoutes.post(
  "/",
  validate({ body: createAdminInviteSchema }),
  adminInviteController.create,
);
adminInviteRoutes.get("/", adminInviteController.list);
