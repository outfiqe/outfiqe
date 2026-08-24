import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import {
  CreatorStatus,
  FulfilmentStatus,
  NotificationEntityType,
  NotificationType,
  UserRole,
  WithdrawRequestStatus,
} from "#generated/prisma/enums.js";
import { userRepository } from "#modules/users/user.repository.js";

import { NOTIFICATION_CONSUMER_GROUP, NOTIFICATION_GROUP_KEYS } from "./notification.constants.js";
import { notificationRepository } from "./notification.repository.js";
import { notificationService } from "./notification.service.js";
import type { CreateIndividualNotificationInput } from "./notification.types.js";

const isApprovedCreator = async (userId: string): Promise<boolean> => {
  const user = await userRepository.findById(userId);
  return Boolean(user?.isCreator) && user?.creatorStatus === CreatorStatus.APPROVED;
};

const WITHDRAW_REQUEST_NOTIFICATION_TYPES: Partial<
  Record<WithdrawRequestStatus, NotificationType>
> = {
  [WithdrawRequestStatus.APPROVED]: NotificationType.WITHDRAW_REQUEST_APPROVED,
  [WithdrawRequestStatus.REJECTED]: NotificationType.WITHDRAW_REQUEST_REJECTED,
  [WithdrawRequestStatus.PAID]: NotificationType.WITHDRAW_REQUEST_PAID,
};

export const registerNotificationEventConsumers = (): void => {
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
        metadata: { lookImageUrl: look?.imageUrl, lookCaption: look?.caption ?? null },
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
    handler: async ({ lookId, creatorId, userId: commenterId }): Promise<void> => {
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
        entityType: NotificationEntityType.LOOK,
        entityId: lookId,
        metadata: { actor, lookImageUrl: look?.imageUrl, lookCaption: look?.caption ?? null },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.LOOK_COMMENT_REPLIED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ lookId, parentCommentAuthorId, userId: replierId }): Promise<void> => {
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
        entityType: NotificationEntityType.LOOK,
        entityId: lookId,
        metadata: { actor, lookImageUrl: look?.imageUrl, lookCaption: look?.caption ?? null },
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

  subscribeToDomainEvent({
    event: DomainEvents.ACHIEVEMENT_UNLOCKED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ userId, badgeId, badgeName, badgeIcon, xpReward }): Promise<void> => {
      await notificationService.notifyIndividual({
        recipientId: userId,
        type: NotificationType.ACHIEVEMENT_UNLOCKED,
        entityType: NotificationEntityType.BADGE,
        entityId: badgeId,
        metadata: { badgeName, badgeIcon, xpReward },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.LEVEL_UP,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ userId, currentLevel }): Promise<void> => {
      await notificationService.notifyIndividual({
        recipientId: userId,
        type: NotificationType.LEVEL_UP,
        metadata: { levelName: currentLevel.name, levelIcon: currentLevel.icon },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.SALE_GENERATED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ creatorId, commissionAmount }): Promise<void> => {
      await notificationService.notifyIndividual({
        recipientId: creatorId,
        type: NotificationType.COMMISSION_EARNED,
        metadata: { commissionAmount },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.PRODUCT_PURCHASED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ orderId }): Promise<void> => {
      const context = await notificationRepository.findOrderNotificationContext(orderId);
      if (!context) return;

      const recipientIds = new Set<string>();
      for (const brandId of context.brandIds) {
        const memberIds = await notificationRepository.findBrandMemberIds(brandId);
        for (const memberId of memberIds) recipientIds.add(memberId);
      }
      if (recipientIds.size === 0) return;

      const inputs: CreateIndividualNotificationInput[] = [...recipientIds].map((recipientId) => ({
        recipientId,
        type: NotificationType.NEW_ORDER,
        entityType: NotificationEntityType.ORDER,
        entityId: orderId,
        metadata: { orderTotal: context.total },
      }));
      await notificationService.notifyManyIndividual(inputs);
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.ORDER_STATUS_CHANGED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ orderId, userId, status }): Promise<void> => {
      await notificationService.notifyIndividual({
        recipientId: userId,
        type: NotificationType.ORDER_STATUS_CHANGED,
        entityType: NotificationEntityType.ORDER,
        entityId: orderId,
        metadata: { status },
      });

      if (status !== FulfilmentStatus.DELIVERED) return;

      const deliveredProducts = await notificationRepository.findDeliveredOrderProducts(orderId);
      const inputs: CreateIndividualNotificationInput[] = deliveredProducts.map(
        ({ productId, productName, imageUrl }) => ({
          recipientId: userId,
          type: NotificationType.REVIEW_REQUESTED,
          entityType: NotificationEntityType.PRODUCT,
          entityId: productId,
          metadata: { productName, productImageUrl: imageUrl },
        }),
      );
      await notificationService.notifyManyIndividual(inputs);
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.PRODUCT_REVIEWED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ productId, userId: reviewerId, rating }): Promise<void> => {
      const [actor, product] = await Promise.all([
        notificationRepository.findActorSnapshot(reviewerId),
        notificationRepository.findProductReviewSnapshot(productId),
      ]);
      if (!actor || !product) return;

      const { brandId, name: productName, imageUrl: productImageUrl } = product;
      const memberIds = await notificationRepository.findBrandMemberIds(brandId);
      const inputs: CreateIndividualNotificationInput[] = memberIds.map((recipientId) => ({
        recipientId,
        actorId: reviewerId,
        type: NotificationType.PRODUCT_REVIEWED,
        entityType: NotificationEntityType.PRODUCT,
        entityId: productId,
        metadata: { actor, productName, productImageUrl, rating },
      }));
      await notificationService.notifyManyIndividual(inputs);
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.BRAND_APPLICATION_SUBMITTED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ applicationId, brandName }): Promise<void> => {
      const adminIds = await userRepository.findIdsByRole(UserRole.ADMIN);
      if (adminIds.length === 0) return;

      const inputs: CreateIndividualNotificationInput[] = adminIds.map((recipientId) => ({
        recipientId,
        type: NotificationType.BRAND_APPLICATION_SUBMITTED,
        entityType: NotificationEntityType.BRAND_APPLICATION,
        entityId: applicationId,
        metadata: { brandName },
      }));
      await notificationService.notifyManyIndividual(inputs);
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.WITHDRAW_REQUEST_STATUS_CHANGED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({
      requestId,
      requestedById,
      actorId,
      status,
      amount,
      rejectionReason,
    }): Promise<void> => {
      const type = WITHDRAW_REQUEST_NOTIFICATION_TYPES[status];
      if (!type) return;

      await notificationService.notifyIndividual({
        recipientId: requestedById,
        actorId,
        type,
        entityType: NotificationEntityType.WITHDRAW_REQUEST,
        entityId: requestId,
        metadata: {
          withdrawAmount: amount,
          ...(rejectionReason ? { rejectionReason } : {}),
        },
      });
    },
  });
};
