import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { notificationController } from "./notification.controller.js";
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
  notificationPreferenceTypeParamSchema,
  updateNotificationPreferenceBodySchema,
} from "./notification.schemas.js";

export const notificationRoutes = Router();

/*
  Static/prefixed paths first — Express would otherwise never reach them once a
  ":id"-shaped route below matched the same segment (same convention as orders).
 */
notificationRoutes.get("/unread-count", requireAuth, notificationController.unreadCount);
notificationRoutes.get("/preferences", requireAuth, notificationController.listPreferences);
notificationRoutes.patch(
  "/preferences/:type",
  requireAuth,
  validate({
    params: notificationPreferenceTypeParamSchema,
    body: updateNotificationPreferenceBodySchema,
  }),
  notificationController.setPreference,
);
notificationRoutes.patch("/read-all", requireAuth, notificationController.markAllRead);

notificationRoutes.get(
  "/",
  requireAuth,
  validate({ query: listNotificationsQuerySchema }),
  notificationController.list,
);
notificationRoutes.patch(
  "/:id/read",
  requireAuth,
  validate({ params: notificationIdParamSchema }),
  notificationController.markRead,
);
