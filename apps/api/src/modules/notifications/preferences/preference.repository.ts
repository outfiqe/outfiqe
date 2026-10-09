import { prisma } from "#db/prisma.js";
import type { NotificationType } from "#generated/prisma/enums.js";

import type { NotificationChannelChanges } from "../notification.types.js";

export const notificationPreferenceRepository = {
  async findMutedRecipientIds(
    recipientIds: string[],
    type: NotificationType,
  ): Promise<Set<string>> {
    if (recipientIds.length === 0) return new Set();
    const rows = await prisma.notificationPreference.findMany({
      where: { userId: { in: recipientIds }, type, enabled: false },
      select: { userId: true },
    });
    return new Set(rows.map((row) => row.userId));
  },

  async isPushMutedForType(userId: string, type: NotificationType): Promise<boolean> {
    const preference = await prisma.notificationPreference.findUnique({
      where: { userId_type: { userId, type } },
      select: { pushEnabled: true },
    });
    return preference?.pushEnabled === false;
  },

  async listPreferenceOverrides(
    userId: string,
  ): Promise<Map<NotificationType, { enabled: boolean; pushEnabled: boolean }>> {
    const rows = await prisma.notificationPreference.findMany({
      where: { userId },
      select: { type: true, enabled: true, pushEnabled: true },
    });
    return new Map(
      rows.map((row) => [row.type, { enabled: row.enabled, pushEnabled: row.pushEnabled }]),
    );
  },

  async setPreference(
    userId: string,
    type: NotificationType,
    changes: NotificationChannelChanges,
  ): Promise<void> {
    await prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type, ...changes },
      update: changes,
    });
  },
};
