import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import { NotificationEntityType, NotificationType } from "#generated/prisma/enums.js";

import { NOTIFICATION_CONSUMER_GROUP, NOTIFICATION_GROUP_KEYS } from "../notification.constants.js";
import { notificationRepository } from "../notification.repository.js";
import { notificationService } from "../notification.service.js";

const subscribeToProductTagSubmitted = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.PRODUCT_TAG_SUBMITTED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ lookId, creatorId, productId, brandId }): Promise<void> => {
      const [actor, look, memberIds] = await Promise.all([
        notificationRepository.findActorSnapshot(creatorId),
        notificationRepository.findLookSnapshot(lookId),
        notificationRepository.findBrandMemberIds(brandId),
      ]);
      if (!actor) return;

      for (const recipientId of memberIds) {
        if (recipientId === creatorId) continue;

        await notificationService.notifyGroup({
          recipientId,
          actorId: creatorId,
          actor,
          type: NotificationType.PRODUCT_TAG_SUBMITTED,
          entityType: NotificationEntityType.PRODUCT,
          entityId: productId,
          groupKey: NOTIFICATION_GROUP_KEYS.tagReviewQueue(brandId),
          metadata: { lookImageUrl: look?.imageUrl },
        });
      }
    },
  });
};

const subscribeToProductTagApproved = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.PRODUCT_TAG_APPROVED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ lookId, creatorId, auto }, { eventId }): Promise<void> => {
      const look = await notificationRepository.findLookSnapshot(lookId);

      await notificationService.notifyIndividual({
        recipientId: creatorId,
        type: NotificationType.PRODUCT_TAG_APPROVED,
        sourceEventId: eventId,
        entityType: NotificationEntityType.LOOK,
        entityId: lookId,
        metadata: { lookImageUrl: look?.imageUrl, tagAutoApproved: auto },
      });
    },
  });
};

const subscribeToTagRemoval = (
  event: typeof DomainEvents.PRODUCT_TAG_REJECTED | typeof DomainEvents.PRODUCT_TAG_REVOKED,
  type: NotificationType,
): void => {
  subscribeToDomainEvent({
    event,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ lookId, creatorId, reason, note }, { eventId }): Promise<void> => {
      const look = await notificationRepository.findLookSnapshot(lookId);

      await notificationService.notifyIndividual({
        recipientId: creatorId,
        type,
        sourceEventId: eventId,
        entityType: NotificationEntityType.LOOK,
        entityId: lookId,
        metadata: {
          lookImageUrl: look?.imageUrl,
          tagRejectionReason: reason,
          tagRejectionNote: note,
        },
      });
    },
  });
};

const subscribeToTagReviewReminderDue = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.TAG_REVIEW_REMINDER_DUE,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ brandId, pendingCount }): Promise<void> => {
      const memberIds = await notificationRepository.findBrandMemberIds(brandId);

      for (const recipientId of memberIds) {
        await notificationService.notifySystemReminder({
          recipientId,
          type: NotificationType.PRODUCT_TAG_REVIEW_REMINDER,
          entityId: brandId,
          groupKey: NOTIFICATION_GROUP_KEYS.tagReviewReminder(brandId),
          metadata: { pendingTagReviewCount: pendingCount },
        });
      }
    },
  });
};

export const registerTagReviewNotificationConsumers = (): void => {
  subscribeToProductTagSubmitted();
  subscribeToProductTagApproved();
  subscribeToTagRemoval(DomainEvents.PRODUCT_TAG_REJECTED, NotificationType.PRODUCT_TAG_REJECTED);
  subscribeToTagRemoval(DomainEvents.PRODUCT_TAG_REVOKED, NotificationType.PRODUCT_TAG_REVOKED);
  subscribeToTagReviewReminderDue();
};
