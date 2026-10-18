import {
  LogisticsAlertType,
  NotificationEntityType,
  NotificationType,
} from "#generated/prisma/enums.js";
import { notificationRepository } from "#modules/notifications/notification.repository.js";
import { notificationService } from "#modules/notifications/notification.service.js";

import type { AlertToNotify } from "./alert.repository.js";

const BRAND_ALERT_TYPES: ReadonlySet<LogisticsAlertType> = new Set([
  LogisticsAlertType.BRAND_NOT_READY,
]);
const CUSTOMER_ALERT_TYPES: ReadonlySet<LogisticsAlertType> = new Set([
  LogisticsAlertType.PROMISE_MISSED,
]);

const orderEntity = (orderId: string | null) =>
  orderId ? { entityType: NotificationEntityType.ORDER, entityId: orderId } : {};

const notifyBrand = async ({ id, alertType, brandId, orderId }: AlertToNotify) => {
  if (!brandId) return;
  const memberIds = await notificationRepository.findBrandMemberIds(brandId);
  await notificationService.notifyManyIndividual(
    memberIds.map((recipientId) => ({
      recipientId,
      type: NotificationType.LOGISTICS_BRAND_NOTICE,
      ...orderEntity(orderId),
      metadata: { logisticsAlertType: alertType, logisticsAlertId: id },
    })),
  );
};

const notifyCustomer = async ({ id, alertType, orderId, order }: AlertToNotify) => {
  if (!order) return;
  await notificationService.notifyIndividual({
    recipientId: order.userId,
    type: NotificationType.ORDER_DELIVERY_LATE,
    ...orderEntity(orderId),
    metadata: { logisticsAlertType: alertType, logisticsAlertId: id },
  });
};

const notifyStaff = async ({ id, alertType, orderId, shipment }: AlertToNotify) => {
  await notificationService.notifyPlatformStaff({
    type: NotificationType.LOGISTICS_STAFF_ALERT,
    ...orderEntity(orderId),
    metadata: {
      logisticsAlertType: alertType,
      logisticsAlertId: id,
      trackingCode: shipment?.trackingCode ?? null,
    },
  });
};

export const sendAlertNotifications = async (alert: AlertToNotify): Promise<void> => {
  if (BRAND_ALERT_TYPES.has(alert.alertType)) {
    await notifyBrand(alert);
    return;
  }
  if (CUSTOMER_ALERT_TYPES.has(alert.alertType)) await notifyCustomer(alert);
  await notifyStaff(alert);
};
