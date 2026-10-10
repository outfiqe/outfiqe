import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import type { CrmLapsedSubscriptionStatus } from "#events/event-bus.types.js";
import {
  NotificationEntityType,
  NotificationType,
  SubscriptionStatus,
} from "#generated/prisma/enums.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import { userRepository } from "#modules/users/user.repository.js";

import { NOTIFICATION_CONSUMER_GROUP } from "../notification.constants.js";
import { notificationService } from "../notification.service.js";

const LAPSED_SUBSCRIPTION_NOTIFICATION_TYPES = {
  [SubscriptionStatus.PAST_DUE]: NotificationType.CRM_SUBSCRIPTION_PAST_DUE,
  [SubscriptionStatus.CANCELED]: NotificationType.CRM_SUBSCRIPTION_CANCELED,
} as const satisfies Record<CrmLapsedSubscriptionStatus, NotificationType>;

export const registerCrmNotificationConsumers = (): void => {
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
};
