import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import { NotificationEntityType, NotificationType } from "#generated/prisma/enums.js";

import { ApprovedAccountKind, NOTIFICATION_CONSUMER_GROUP } from "../notification.constants.js";
import { notificationRepository } from "../notification.repository.js";
import { notificationService } from "../notification.service.js";

export const registerAccountNotificationConsumers = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.CREATOR_APPROVED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ userId }, { eventId }): Promise<void> => {
      await notificationService.notifyIndividual({
        recipientId: userId,
        type: NotificationType.ACCOUNT_APPROVED,
        sourceEventId: eventId,
        metadata: { approvedAccountKind: ApprovedAccountKind.CREATOR },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.BRAND_OWNER_REGISTERED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ userId, brandId }, { eventId }): Promise<void> => {
      const brandName = await notificationRepository.findBrandName(brandId);

      await notificationService.notifyIndividual({
        recipientId: userId,
        type: NotificationType.ACCOUNT_APPROVED,
        sourceEventId: eventId,
        metadata: {
          approvedAccountKind: ApprovedAccountKind.BRAND,
          ...(brandName ? { brandName } : {}),
        },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.BRAND_APPLICATION_SUBMITTED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ applicationId, brandName }, { eventId }): Promise<void> => {
      await notificationService.notifyPlatformStaff({
        type: NotificationType.BRAND_APPLICATION_SUBMITTED,
        sourceEventId: eventId,
        entityType: NotificationEntityType.BRAND_APPLICATION,
        entityId: applicationId,
        metadata: { brandName },
      });
    },
  });
};
