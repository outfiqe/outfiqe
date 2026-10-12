import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import { NotificationEntityType, NotificationType } from "#generated/prisma/enums.js";

import { NOTIFICATION_CONSUMER_GROUP } from "../notification.constants.js";
import { notificationService } from "../notification.service.js";

export const registerSupportNotificationConsumers = (): void => {
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
};
