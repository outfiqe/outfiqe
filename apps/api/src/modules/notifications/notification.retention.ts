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
