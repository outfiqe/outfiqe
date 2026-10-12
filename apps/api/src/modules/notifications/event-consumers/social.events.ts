import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import {
  CreatorStatus,
  NotificationEntityType,
  NotificationType,
} from "#generated/prisma/enums.js";
import { userRepository } from "#modules/users/user.repository.js";

import { NOTIFICATION_CONSUMER_GROUP, NOTIFICATION_GROUP_KEYS } from "../notification.constants.js";
import { notificationRepository } from "../notification.repository.js";
import { notificationService } from "../notification.service.js";

const isApprovedCreator = async (userId: string): Promise<boolean> => {
  const user = await userRepository.findById(userId);
  return Boolean(user?.isCreator) && user?.creatorStatus === CreatorStatus.APPROVED;
};

export const registerSocialNotificationConsumers = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.LOOK_LIKED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ lookId, creatorId, userId: likerId }): Promise<void> => {
      if (likerId === creatorId) return;

      const [actor, look] = await Promise.all([
        notificationRepository.findActorSnapshot(likerId),
        notificationRepository.findLookSnapshot(lookId),
      ]);
      if (!actor) return;

      await notificationService.notifyGroup({
        recipientId: creatorId,
        actorId: likerId,
        actor,
        type: NotificationType.LOOK_LIKED,
        entityType: NotificationEntityType.LOOK,
        entityId: lookId,
        groupKey: NOTIFICATION_GROUP_KEYS.lookLiked(lookId),
        metadata: {
          lookImageUrl: look?.imageUrl,
          lookCaption: look?.caption ?? null,
          lookOwnerHandle: look?.ownerHandle,
        },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.LOOK_UNLIKED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ lookId, creatorId, userId: likerId }): Promise<void> => {
      if (likerId === creatorId) return;

      await notificationService.retractGroupActor({
        recipientId: creatorId,
        groupKey: NOTIFICATION_GROUP_KEYS.lookLiked(lookId),
        actorId: likerId,
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.LOOK_COMMENTED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ lookId, creatorId, userId: commenterId }, { eventId }): Promise<void> => {
      if (commenterId === creatorId) return;

      const [actor, look] = await Promise.all([
        notificationRepository.findActorSnapshot(commenterId),
        notificationRepository.findLookSnapshot(lookId),
      ]);
      if (!actor) return;

      await notificationService.notifyIndividual({
        recipientId: creatorId,
        actorId: commenterId,
        type: NotificationType.LOOK_COMMENTED,
        sourceEventId: eventId,
        entityType: NotificationEntityType.LOOK,
        entityId: lookId,
        metadata: {
          actor,
          lookImageUrl: look?.imageUrl,
          lookCaption: look?.caption ?? null,
          lookOwnerHandle: look?.ownerHandle,
        },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.LOOK_COMMENT_REPLIED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async (
      { lookId, parentCommentAuthorId, userId: replierId },
      { eventId },
    ): Promise<void> => {
      if (replierId === parentCommentAuthorId) return;

      const [actor, look] = await Promise.all([
        notificationRepository.findActorSnapshot(replierId),
        notificationRepository.findLookSnapshot(lookId),
      ]);
      if (!actor) return;

      await notificationService.notifyIndividual({
        recipientId: parentCommentAuthorId,
        actorId: replierId,
        type: NotificationType.COMMENT_REPLIED,
        sourceEventId: eventId,
        entityType: NotificationEntityType.LOOK,
        entityId: lookId,
        metadata: {
          actor,
          lookImageUrl: look?.imageUrl,
          lookCaption: look?.caption ?? null,
          lookOwnerHandle: look?.ownerHandle,
        },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.USER_FOLLOWED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ followerId, followingId }): Promise<void> => {
      if (followerId === followingId) return;
      if (!(await isApprovedCreator(followingId))) return;

      const actor = await notificationRepository.findActorSnapshot(followerId);
      if (!actor) return;

      await notificationService.notifyGroup({
        recipientId: followingId,
        actorId: followerId,
        actor,
        type: NotificationType.NEW_FOLLOWER,
        entityType: NotificationEntityType.USER,
        entityId: followerId,
        groupKey: NOTIFICATION_GROUP_KEYS.newFollower(),
        metadata: {},
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.BRAND_FOLLOWED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ followerId, followingId: brandId }): Promise<void> => {
      const [actor, memberIds] = await Promise.all([
        notificationRepository.findActorSnapshot(followerId),
        notificationRepository.findBrandMemberIds(brandId),
      ]);
      if (!actor) return;

      for (const recipientId of memberIds) {
        if (recipientId === followerId) continue;

        await notificationService.notifyGroup({
          recipientId,
          actorId: followerId,
          actor,
          type: NotificationType.NEW_BRAND_FOLLOWER,
          entityType: NotificationEntityType.USER,
          entityId: followerId,
          groupKey: NOTIFICATION_GROUP_KEYS.newBrandFollower(),
          metadata: {},
        });
      }
    },
  });
};
