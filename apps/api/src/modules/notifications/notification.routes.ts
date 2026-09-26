import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { notificationController } from "./notification.controller.js";
import { resolveTenantForTenantScope } from "./notification.middleware.js";
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
  notificationPreferenceTypeParamSchema,
  notificationScopeQuerySchema,
  updateNotificationPreferenceBodySchema,
} from "./notification.schemas.js";

export const notificationRoutes = Router();

notificationRoutes.get(
  "/unread-count",
  requireAuth,
  validate({ query: notificationScopeQuerySchema }),
  resolveTenantForTenantScope,
  notificationController.unreadCount,
);
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
notificationRoutes.patch(
  "/read-all",
  requireAuth,
  validate({ query: notificationScopeQuerySchema }),
  resolveTenantForTenantScope,
  notificationController.markAllRead,
);

notificationRoutes.get(
  "/",
  requireAuth,
  validate({ query: listNotificationsQuerySchema }),
  resolveTenantForTenantScope,
  notificationController.list,
);
notificationRoutes.patch(
  "/:id/read",
  requireAuth,
  validate({ params: notificationIdParamSchema }),
  notificationController.markRead,
);
