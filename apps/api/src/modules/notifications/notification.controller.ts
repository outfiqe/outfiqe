import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  ListNotificationsQuery,
  NotificationIdParam,
  NotificationPreferenceTypeParam,
  UpdateNotificationPreferenceBody,
} from "./notification.schemas.js";
import { notificationService } from "./notification.service.js";

export const notificationController = {
  async list(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListNotificationsQuery>(res);

    const page = await notificationService.listFeed(userId, query);
    sendSuccess(res, page, "Notifications.");
  },

  async unreadCount(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);

    const count = await notificationService.getUnreadCount(userId);
    sendSuccess(res, { count }, "Unread count.");
  },

  async markRead(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<NotificationIdParam>(res);

    await notificationService.markRead(userId, id);
    sendSuccess(res, { id }, "Marked as read.");
  },

  async markAllRead(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);

    await notificationService.markAllRead(userId);
    sendSuccess(res, {}, "Marked all as read.");
  },

  async listPreferences(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);

    const preferences = await notificationService.listPreferences(userId);
    sendSuccess(res, { preferences }, "Notification preferences.");
  },

  async setPreference(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { type } = validated.params<NotificationPreferenceTypeParam>(res);
    const { enabled } = validated.body<UpdateNotificationPreferenceBody>(res);

    await notificationService.setPreference(userId, type, enabled);
    sendSuccess(res, { type, enabled }, "Notification preference updated.");
  },
};
