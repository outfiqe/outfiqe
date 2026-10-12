import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import {
  FulfilmentStatus,
  NotificationEntityType,
  NotificationType,
  WithdrawRequestStatus,
} from "#generated/prisma/enums.js";

import { NOTIFICATION_CONSUMER_GROUP } from "../notification.constants.js";
import { notificationRepository } from "../notification.repository.js";
import { notificationService } from "../notification.service.js";
import type { CreateIndividualNotificationInput } from "../notification.types.js";

const WITHDRAW_REQUEST_NOTIFICATION_TYPES: Partial<
  Record<WithdrawRequestStatus, NotificationType>
> = {
  [WithdrawRequestStatus.APPROVED]: NotificationType.WITHDRAW_REQUEST_APPROVED,
  [WithdrawRequestStatus.REJECTED]: NotificationType.WITHDRAW_REQUEST_REJECTED,
  [WithdrawRequestStatus.PAID]: NotificationType.WITHDRAW_REQUEST_PAID,
};

export const registerCommerceNotificationConsumers = (): void => {
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
};
