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
    event: DomainEvents.CRM_ITEM_ASSIGNED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({
      itemKind,
      itemId,
      title,
      assigneeUserId,
      assignedByUserId,
    }): Promise<void> => {
      if (assigneeUserId === assignedByUserId) return;

      await notificationService.notifyIndividual({
        recipientId: assigneeUserId,
        actorId: assignedByUserId,
        type: NotificationType.CRM_ITEM_ASSIGNED,
        entityType:
          itemKind === "ticket"
            ? NotificationEntityType.CRM_TICKET
            : NotificationEntityType.CRM_TASK,
        entityId: itemId,
        metadata: { crmItemKind: itemKind, crmItemTitle: title },
      });
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

  subscribeToDomainEvent({
    event: DomainEvents.SUPPORT_TICKET_CREATED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ ticketId, subject }): Promise<void> => {
      const adminIds = await userRepository.findIdsByRole(UserRole.ADMIN);
      if (adminIds.length === 0) return;

      await notificationService.notifyManyIndividual(
        adminIds.map((recipientId) => ({
          recipientId,
          type: NotificationType.SUPPORT_TICKET_CREATED,
          entityType: NotificationEntityType.SUPPORT_TICKET,
          entityId: ticketId,
          metadata: { supportSubject: subject },
        })),
      );
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.SUPPORT_TICKET_ASSIGNED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ ticketId, subject, assigneeUserId, assignedByUserId }): Promise<void> => {
      if (assigneeUserId === assignedByUserId) return;

      await notificationService.notifyIndividual({
        recipientId: assigneeUserId,
        actorId: assignedByUserId,
        type: NotificationType.SUPPORT_TICKET_ASSIGNED,
        entityType: NotificationEntityType.SUPPORT_TICKET,
        entityId: ticketId,
        metadata: { supportSubject: subject },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.SUPPORT_TICKET_STAFF_REPLIED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ ticketId, subject, requesterUserId }): Promise<void> => {
      if (!requesterUserId) return;

      await notificationService.notifyIndividual({
        recipientId: requesterUserId,
        type: NotificationType.SUPPORT_TICKET_REPLY,
        entityType: NotificationEntityType.SUPPORT_TICKET,
        entityId: ticketId,
        metadata: { supportSubject: subject },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.SUPPORT_TICKET_CUSTOMER_REPLIED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ ticketId, subject, assigneeUserId }): Promise<void> => {
      const recipientIds = assigneeUserId
        ? [assigneeUserId]
        : await userRepository.findIdsByRole(UserRole.ADMIN);
      if (recipientIds.length === 0) return;

      await notificationService.notifyManyIndividual(
        recipientIds.map((recipientId) => ({
          recipientId,
          type: NotificationType.SUPPORT_TICKET_REPLY,
          entityType: NotificationEntityType.SUPPORT_TICKET,
          entityId: ticketId,
          metadata: { supportSubject: subject },
        })),
      );
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.SUPPORT_TICKET_RESOLVED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ ticketId, subject, requesterUserId }): Promise<void> => {
      if (!requesterUserId) return;

      await notificationService.notifyIndividual({
        recipientId: requesterUserId,
        type: NotificationType.SUPPORT_TICKET_RESOLVED,
        entityType: NotificationEntityType.SUPPORT_TICKET,
        entityId: ticketId,
        metadata: { supportSubject: subject },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.COUPON_APPROVAL_REQUESTED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ couponId, code, createdById, totalBudgetAmount }): Promise<void> => {
      const adminIds = await userRepository.findIdsByRole(UserRole.ADMIN);
      const recipientIds = adminIds.filter((adminId) => adminId !== createdById);
      if (recipientIds.length === 0) return;

      await notificationService.notifyManyIndividual(
        recipientIds.map((recipientId) => ({
          recipientId,
          type: NotificationType.COUPON_APPROVAL_REQUESTED,
          entityType: NotificationEntityType.COUPON,
          entityId: couponId,
          metadata: { couponCode: code, totalBudgetAmount },
        })),
      );
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.COUPON_REDEMPTION_FLAGGED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ orderId, flagReason }): Promise<void> => {
      const adminIds = await userRepository.findIdsByRole(UserRole.ADMIN);
      if (adminIds.length === 0) return;

      await notificationService.notifyManyIndividual(
        adminIds.map((recipientId) => ({
          recipientId,
          type: NotificationType.COUPON_REDEMPTION_FLAGGED,
          entityType: NotificationEntityType.ORDER,
          entityId: orderId,
          metadata: { flagReason },
        })),
      );
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.COUPON_BUDGET_ALERT,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({
      couponId,
      code,
      thresholdPercent,
      spentAmount,
      totalBudgetAmount,
    }): Promise<void> => {
      const adminIds = await userRepository.findIdsByRole(UserRole.ADMIN);
      if (adminIds.length === 0) return;

      await notificationService.notifyManyIndividual(
        adminIds.map((recipientId) => ({
          recipientId,
          type: NotificationType.COUPON_BUDGET_ALERT,
          entityType: NotificationEntityType.COUPON,
          entityId: couponId,
          metadata: { couponCode: code, thresholdPercent, spentAmount, totalBudgetAmount },
        })),
      );
    },
  });
};
