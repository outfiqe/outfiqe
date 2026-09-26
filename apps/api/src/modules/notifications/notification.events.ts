import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import type { CrmLapsedSubscriptionStatus } from "#events/event-bus.types.js";
import {
  CreatorStatus,
  FulfilmentStatus,
  NotificationEntityType,
  NotificationType,
  SubscriptionStatus,
  WithdrawRequestStatus,
} from "#generated/prisma/enums.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
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

const LAPSED_SUBSCRIPTION_NOTIFICATION_TYPES = {
  [SubscriptionStatus.PAST_DUE]: NotificationType.CRM_SUBSCRIPTION_PAST_DUE,
  [SubscriptionStatus.CANCELED]: NotificationType.CRM_SUBSCRIPTION_CANCELED,
} as const satisfies Record<CrmLapsedSubscriptionStatus, NotificationType>;

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

  subscribeToDomainEvent({
    event: DomainEvents.ACHIEVEMENT_UNLOCKED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async (
      { userId, badgeId, badgeName, badgeIcon, xpReward },
      { eventId },
    ): Promise<void> => {
      await notificationService.notifyIndividual({
        recipientId: userId,
        type: NotificationType.ACHIEVEMENT_UNLOCKED,
        sourceEventId: eventId,
        entityType: NotificationEntityType.BADGE,
        entityId: badgeId,
        metadata: { badgeName, badgeIcon, xpReward },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.LEVEL_UP,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ userId, currentLevel }, { eventId }): Promise<void> => {
      await notificationService.notifyIndividual({
        recipientId: userId,
        type: NotificationType.LEVEL_UP,
        sourceEventId: eventId,
        metadata: { levelName: currentLevel.name, levelIcon: currentLevel.icon },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.SALE_GENERATED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ creatorId, commissionAmount }, { eventId }): Promise<void> => {
      await notificationService.notifyIndividual({
        recipientId: creatorId,
        type: NotificationType.COMMISSION_EARNED,
        sourceEventId: eventId,
        metadata: { commissionAmount },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.PRODUCT_PURCHASED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ orderId }, { eventId }): Promise<void> => {
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
        sourceEventId: eventId,
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
    handler: async ({ orderId, userId, status }, { eventId }): Promise<void> => {
      await notificationService.notifyIndividual({
        recipientId: userId,
        type: NotificationType.ORDER_STATUS_CHANGED,
        sourceEventId: eventId,
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
          sourceEventId: eventId,
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
    handler: async ({ productId, userId: reviewerId, rating }, { eventId }): Promise<void> => {
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
        sourceEventId: eventId,
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

  subscribeToDomainEvent({
    event: DomainEvents.CRM_ITEM_ASSIGNED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async (
      { organizationId, itemKind, itemId, title, assigneeUserId, assignedByUserId },
      { eventId },
    ): Promise<void> => {
      if (assigneeUserId === assignedByUserId) return;

      const organization = await crmAccessRepository.findOrganizationById(organizationId);

      await notificationService.notifyIndividual({
        recipientId: assigneeUserId,
        actorId: assignedByUserId,
        type: NotificationType.CRM_ITEM_ASSIGNED,
        sourceEventId: eventId,
        entityType:
          itemKind === "ticket"
            ? NotificationEntityType.CRM_TICKET
            : NotificationEntityType.CRM_TASK,
        entityId: itemId,
        organizationId,
        metadata: {
          crmItemKind: itemKind,
          crmItemTitle: title,
          crmOrganizationSubdomain: organization?.subdomain ?? null,
          crmOrganizationIsPlatformOrg: organization?.isPlatformOrg ?? false,
        },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.CRM_TICKET_CREATED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async (
      { organizationId, ticketId, title, assigneeUserId, createdByUserId },
      { eventId },
    ): Promise<void> => {
      if (assigneeUserId) return;

      await notificationService.notifyTenantStaff(organizationId, {
        actorId: createdByUserId,
        type: NotificationType.CRM_TICKET_UNASSIGNED,
        sourceEventId: eventId,
        entityType: NotificationEntityType.CRM_TICKET,
        entityId: ticketId,
        metadata: { crmItemKind: "ticket", crmItemTitle: title },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.CRM_MEMBER_JOINED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ organizationId, userId }, { eventId }): Promise<void> => {
      const member = await userRepository.findById(userId);
      if (!member) return;

      await notificationService.notifyTenantStaff(organizationId, {
        actorId: userId,
        type: NotificationType.CRM_MEMBER_JOINED,
        sourceEventId: eventId,
        entityType: NotificationEntityType.USER,
        entityId: userId,
        metadata: { crmMemberName: member.name },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.CRM_MEMBERSHIP_ENDED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ organizationId, userId }): Promise<void> => {
      await notificationService.clearOrganizationNotificationsFor(userId, organizationId);
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.CRM_INVOICE_OPENED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ organizationId, invoiceId, amount }, { eventId }): Promise<void> => {
      await notificationService.notifyTenantStaff(organizationId, {
        type: NotificationType.CRM_INVOICE_DUE,
        sourceEventId: eventId,
        entityType: NotificationEntityType.CRM_SUBSCRIPTION_INVOICE,
        entityId: invoiceId,
        metadata: { crmInvoiceAmount: amount },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.CRM_SUBSCRIPTION_LAPSED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ organizationId, subscriptionId, status }, { eventId }): Promise<void> => {
      await notificationService.notifyTenantStaff(organizationId, {
        type: LAPSED_SUBSCRIPTION_NOTIFICATION_TYPES[status],
        sourceEventId: eventId,
        entityType: NotificationEntityType.CRM_SUBSCRIPTION,
        entityId: subscriptionId,
        metadata: {},
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.WITHDRAW_REQUEST_STATUS_CHANGED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async (
      { requestId, requestedById, actorId, status, amount, rejectionReason },
      { eventId },
    ): Promise<void> => {
      const type = WITHDRAW_REQUEST_NOTIFICATION_TYPES[status];
      if (!type) return;

      await notificationService.notifyIndividual({
        recipientId: requestedById,
        actorId,
        type,
        sourceEventId: eventId,
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
    handler: async ({ ticketId, subject }, { eventId }): Promise<void> => {
      await notificationService.notifyPlatformStaff({
        type: NotificationType.SUPPORT_TICKET_CREATED,
        sourceEventId: eventId,
        entityType: NotificationEntityType.SUPPORT_TICKET,
        entityId: ticketId,
        metadata: { supportSubject: subject },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.SUPPORT_TICKET_ASSIGNED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async (
      { ticketId, subject, assigneeUserId, assignedByUserId },
      { eventId },
    ): Promise<void> => {
      if (assigneeUserId === assignedByUserId) return;

      await notificationService.notifyPlatformStaffMember(assigneeUserId, {
        actorId: assignedByUserId,
        type: NotificationType.SUPPORT_TICKET_ASSIGNED,
        sourceEventId: eventId,
        entityType: NotificationEntityType.SUPPORT_TICKET,
        entityId: ticketId,
        metadata: { supportSubject: subject },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.SUPPORT_TICKET_STAFF_REPLIED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ ticketId, subject, requesterUserId }, { eventId }): Promise<void> => {
      if (!requesterUserId) return;

      await notificationService.notifyIndividual({
        recipientId: requesterUserId,
        type: NotificationType.SUPPORT_TICKET_REPLY,
        sourceEventId: eventId,
        entityType: NotificationEntityType.SUPPORT_TICKET,
        entityId: ticketId,
        metadata: { supportSubject: subject },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.SUPPORT_TICKET_CUSTOMER_REPLIED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ ticketId, subject, assigneeUserId }, { eventId }): Promise<void> => {
      const staffReplyNotification = {
        type: NotificationType.SUPPORT_TICKET_REPLY,
        sourceEventId: eventId,
        entityType: NotificationEntityType.SUPPORT_TICKET,
        entityId: ticketId,
        metadata: { supportSubject: subject },
        recipientIsStaff: true,
      };

      await (assigneeUserId
        ? notificationService.notifyPlatformStaffMember(assigneeUserId, staffReplyNotification)
        : notificationService.notifyPlatformStaff(staffReplyNotification));
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.SUPPORT_TICKET_RESOLVED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ ticketId, subject, requesterUserId }, { eventId }): Promise<void> => {
      if (!requesterUserId) return;

      await notificationService.notifyIndividual({
        recipientId: requesterUserId,
        type: NotificationType.SUPPORT_TICKET_RESOLVED,
        sourceEventId: eventId,
        entityType: NotificationEntityType.SUPPORT_TICKET,
        entityId: ticketId,
        metadata: { supportSubject: subject },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.COUPON_APPROVAL_REQUESTED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async (
      { couponId, code, createdById, totalBudgetAmount },
      { eventId },
    ): Promise<void> => {
      await notificationService.notifyPlatformStaff({
        actorId: createdById,
        type: NotificationType.COUPON_APPROVAL_REQUESTED,
        sourceEventId: eventId,
        entityType: NotificationEntityType.COUPON,
        entityId: couponId,
        metadata: { couponCode: code, totalBudgetAmount },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.COUPON_REDEMPTION_FLAGGED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ orderId, flagReason }, { eventId }): Promise<void> => {
      await notificationService.notifyPlatformStaff({
        type: NotificationType.COUPON_REDEMPTION_FLAGGED,
        sourceEventId: eventId,
        entityType: NotificationEntityType.ORDER,
        entityId: orderId,
        metadata: { flagReason },
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.COUPON_BUDGET_ALERT,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async (
      { couponId, code, thresholdPercent, spentAmount, totalBudgetAmount },
      { eventId },
    ): Promise<void> => {
      await notificationService.notifyPlatformStaff({
        type: NotificationType.COUPON_BUDGET_ALERT,
        sourceEventId: eventId,
        entityType: NotificationEntityType.COUPON,
        entityId: couponId,
        metadata: { couponCode: code, thresholdPercent, spentAmount, totalBudgetAmount },
      });
    },
  });

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

  const registerTagRemovalNotification = (
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

  registerTagRemovalNotification(
    DomainEvents.PRODUCT_TAG_REJECTED,
    NotificationType.PRODUCT_TAG_REJECTED,
  );
  registerTagRemovalNotification(
    DomainEvents.PRODUCT_TAG_REVOKED,
    NotificationType.PRODUCT_TAG_REVOKED,
  );

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
