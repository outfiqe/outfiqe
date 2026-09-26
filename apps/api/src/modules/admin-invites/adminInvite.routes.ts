import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";
import {
  requireCoFounder,
  requirePlatformNavItem,
} from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { adminInviteController } from "./adminInvite.controller.js";
import { createAdminInviteSchema } from "./adminInvite.schemas.js";

export const adminInviteRoutes = Router();

adminInviteRoutes.use(...platformGuards.teamManage, requirePlatformNavItem("team"));

adminInviteRoutes.post(
  "/",
  ...requireCoFounder,
  validate({ body: createAdminInviteSchema }),
  adminInviteController.create,
);
adminInviteRoutes.get("/", adminInviteController.list);
