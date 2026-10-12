import { prisma } from "#db/prisma.js";
import type { NotificationType } from "#generated/prisma/enums.js";
import { decodeCursor } from "#lib/pagination.utils.js";

import { notificationContextRepository } from "./context/context.repository.js";
import { notificationDeliveryRepository } from "./delivery/delivery.repository.js";
import type {
  NotificationFeedCursor,
  NotificationOrganizationFilter,
  NotificationRecord,
} from "./notification.types.js";
import { toNotificationRecord } from "./notification.utils.js";
import { notificationPreferenceRepository } from "./preferences/preference.repository.js";

const toOrganizationWhere = ({ organizationId }: NotificationOrganizationFilter) =>
  organizationId ? { organizationId } : {};

export const notificationRepository = {
  async listForRecipient(
    recipientId: string,
    params: NotificationOrganizationFilter & { cursor?: string; limit: number },
  ): Promise<NotificationRecord[]> {
    const decoded = decodeCursor<NotificationFeedCursor>(params.cursor);

    const rows = await prisma.notification.findMany({
      where: {
        recipientId,
        ...toOrganizationWhere(params),
        ...(decoded
          ? {
              OR: [
                { updatedAt: { lt: new Date(decoded.updatedAt) } },
                { updatedAt: new Date(decoded.updatedAt), id: { lt: decoded.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
    });
    return rows.map(toNotificationRecord);
  },

  async countUnread(
    recipientId: string,
    filter: NotificationOrganizationFilter = {},
  ): Promise<number> {
    return prisma.notification.count({
      where: { recipientId, isRead: false, ...toOrganizationWhere(filter) },
    });
  },

  async markRead(recipientId: string, notificationId: string): Promise<NotificationRecord | null> {
    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, recipientId },
    });
    if (!existing) return null;
    if (existing.isRead) return toNotificationRecord(existing);

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
    return toNotificationRecord(updated);
  },

  async markAllRead(
    recipientId: string,
    filter: NotificationOrganizationFilter = {},
  ): Promise<Date> {
    const readAt = new Date();
    await prisma.notification.updateMany({
      where: { recipientId, isRead: false, ...toOrganizationWhere(filter) },
      data: { isRead: true, readAt },
    });
    return readAt;
  },

  async deleteForRecipientInOrganization(
    recipientId: string,
    organizationId: string,
  ): Promise<number> {
    const { count } = await prisma.notification.deleteMany({
      where: { recipientId, organizationId },
    });
    return count;
  },

  async deleteReadBefore(readBefore: Date, types: NotificationType[]): Promise<number> {
    if (types.length === 0) return 0;
    const { count } = await prisma.notification.deleteMany({
      where: { isRead: true, readAt: { lt: readBefore }, type: { in: types } },
    });
    return count;
  },

  ...notificationDeliveryRepository,

  ...notificationContextRepository,

  ...notificationPreferenceRepository,
};
