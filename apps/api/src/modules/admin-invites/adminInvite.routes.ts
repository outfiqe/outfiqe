import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { adminInviteController } from "./adminInvite.controller.js";
import { createAdminInviteSchema } from "./adminInvite.schemas.js";

export const adminInviteRoutes = Router();

adminInviteRoutes.use(requireAuth, requirePlatformAccess, requirePlatformNavItem("team"));

adminInviteRoutes.post(
  "/",
  validate({ body: createAdminInviteSchema }),
  adminInviteController.create,
);
adminInviteRoutes.get("/", adminInviteController.list);
