import { Router } from "express";

import { validate } from "#middlewares/validate.js";
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

const requireAnnouncementRead = [
  ...requirePlatformRole("platform:announcements:read", "platform:announcements:manage"),
  requirePlatformNavItem("announcements"),
];
const requireAnnouncementManage = [
  ...requirePlatformRole("platform:announcements:manage"),
  requirePlatformNavItem("announcements"),
];

export const announcementRoutes = Router();

announcementRoutes.post(
  "/",
  ...requireAnnouncementManage,
  validate({ body: createAnnouncementSchema }),
  announcementController.create,
);
announcementRoutes.get(
  "/",
  ...requireAnnouncementRead,
  validate({ query: listAnnouncementsQuerySchema }),
  announcementController.list,
);
announcementRoutes.get(
  "/:id",
  ...requireAnnouncementRead,
  validate({ params: announcementIdParamSchema }),
  announcementController.getById,
);
announcementRoutes.patch(
  "/:id",
  ...requireAnnouncementManage,
  validate({ params: announcementIdParamSchema, body: updateAnnouncementSchema }),
  announcementController.update,
);
announcementRoutes.post(
  "/:id/send",
  ...requireAnnouncementManage,
  validate({ params: announcementIdParamSchema, body: sendAnnouncementSchema }),
  announcementController.send,
);
announcementRoutes.post(
  "/:id/cancel",
  ...requireAnnouncementManage,
  validate({ params: announcementIdParamSchema }),
  announcementController.cancel,
);
