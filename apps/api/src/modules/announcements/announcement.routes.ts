import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { announcementController } from "./announcement.controller.js";
import {
  announcementIdParamSchema,
  createAnnouncementSchema,
  listAnnouncementsQuerySchema,
  sendAnnouncementSchema,
  updateAnnouncementSchema,
} from "./announcement.schemas.js";

const requireAnnouncementAdmin = [
  requireAuth,
  requirePlatformAccess,
  requirePlatformNavItem("announcements"),
];
const requireAnnouncementMutationAdmin = [
  ...requirePlatformRole("platform:announcements:manage"),
  requirePlatformNavItem("announcements"),
];

export const announcementRoutes = Router();

announcementRoutes.post(
  "/",
  ...requireAnnouncementMutationAdmin,
  validate({ body: createAnnouncementSchema }),
  announcementController.create,
);
announcementRoutes.get(
  "/",
  ...requireAnnouncementAdmin,
  validate({ query: listAnnouncementsQuerySchema }),
  announcementController.list,
);
announcementRoutes.get(
  "/:id",
  ...requireAnnouncementAdmin,
  validate({ params: announcementIdParamSchema }),
  announcementController.getById,
);
announcementRoutes.patch(
  "/:id",
  ...requireAnnouncementMutationAdmin,
  validate({ params: announcementIdParamSchema, body: updateAnnouncementSchema }),
  announcementController.update,
);
announcementRoutes.post(
  "/:id/send",
  ...requireAnnouncementMutationAdmin,
  validate({ params: announcementIdParamSchema, body: sendAnnouncementSchema }),
  announcementController.send,
);
announcementRoutes.post(
  "/:id/cancel",
  ...requireAnnouncementMutationAdmin,
  validate({ params: announcementIdParamSchema }),
  announcementController.cancel,
);
