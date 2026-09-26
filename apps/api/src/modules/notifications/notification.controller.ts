import { NotificationFeedScope } from "@outfiqe/types";
import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";
import { getResolvedOrganization } from "#modules/crm-access/crm-access.middleware.js";

import type {
  ListNotificationsQuery,
  NotificationIdParam,
  NotificationPreferenceTypeParam,
  NotificationScopeQuery,
  UpdateNotificationPreferenceBody,
} from "./notification.schemas.js";
import { notificationService } from "./notification.service.js";
import type { NotificationOrganizationFilter } from "./notification.types.js";

const toOrganizationFilter = (
  res: Response,
  scope: NotificationFeedScope,
): NotificationOrganizationFilter =>
  scope === NotificationFeedScope.TENANT ? { organizationId: getResolvedOrganization(res).id } : {};

export const notificationController = {
  async list(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { scope, cursor, limit } = validated.query<ListNotificationsQuery>(res);

    const page = await notificationService.listFeed(userId, {
      cursor,
      limit,
      ...toOrganizationFilter(res, scope),
    });
    sendSuccess(res, page, "Notifications.");
  },

  async unreadCount(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { scope } = validated.query<NotificationScopeQuery>(res);

    const count = await notificationService.getUnreadCount(
      userId,
      toOrganizationFilter(res, scope),
    );
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
    const { scope } = validated.query<NotificationScopeQuery>(res);

    await notificationService.markAllRead(userId, toOrganizationFilter(res, scope));
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
    const changes = validated.body<UpdateNotificationPreferenceBody>(res);

    await notificationService.setPreference(userId, type, changes);
    sendSuccess(res, { type, ...changes }, "Notification preference updated.");
  },
};
