import { NotificationType } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";

import {
  CRITICAL_READ_RETENTION_DAYS,
  CRITICAL_RETENTION_NOTIFICATION_TYPES,
  STANDARD_READ_RETENTION_DAYS,
} from "./notification.constants.js";
import { notificationRepository } from "./notification.repository.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const STANDARD_RETENTION_TYPES = Object.values(NotificationType).filter(
  (type) => !CRITICAL_RETENTION_NOTIFICATION_TYPES.has(type),
);

/**
 * Deletes read notifications past their retention window — never unread
 * ones, regardless of age or type (see notifications/README.md). Two
 * windows, not one: types with real business/money weight (new orders,
 * order status, commissions, brand applications) get
 * CRITICAL_READ_RETENTION_DAYS; everything else gets
 * STANDARD_READ_RETENTION_DAYS.
 */
export const runNotificationRetentionSweep = async (): Promise<{ deleted: number }> => {
  const now = Date.now();
  const standardCutoff = new Date(now - STANDARD_READ_RETENTION_DAYS * DAY_MS);
  const criticalCutoff = new Date(now - CRITICAL_READ_RETENTION_DAYS * DAY_MS);

  const [standardDeleted, criticalDeleted] = await Promise.all([
    notificationRepository.deleteReadBefore(standardCutoff, STANDARD_RETENTION_TYPES),
    notificationRepository.deleteReadBefore(criticalCutoff, [
      ...CRITICAL_RETENTION_NOTIFICATION_TYPES,
    ]),
  ]);

  const deleted = standardDeleted + criticalDeleted;
  if (deleted > 0)
    logger.info(`Notification retention sweep deleted ${deleted} read notifications`);
  return { deleted };
};
