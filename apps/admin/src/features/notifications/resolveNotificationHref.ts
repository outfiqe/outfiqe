import type { Notification } from "@outfiqe/types";

export type AdminNotificationTarget =
  | { to: "/platform/brand-applications" }
  | { to: "/support" }
  | { to: "/support/$ticketId"; params: { ticketId: string } }
  | { to: "/crm/tasks" }
  | { to: "/crm/support" };

export const resolveNotificationHref = (
  notification: Notification,
): AdminNotificationTarget | null => {
  switch (notification.type) {
    case "BRAND_APPLICATION_SUBMITTED":
      return { to: "/platform/brand-applications" };
    case "SUPPORT_TICKET_CREATED":
    case "SUPPORT_TICKET_ASSIGNED":
    case "SUPPORT_TICKET_REPLY":
      return notification.entityId
        ? { to: "/support/$ticketId", params: { ticketId: notification.entityId } }
        : { to: "/support" };
    case "CRM_ITEM_ASSIGNED":
      return notification.metadata.crmItemKind === "task"
        ? { to: "/crm/tasks" }
        : { to: "/crm/support" };
    case "LOOK_LIKED":
    case "LOOK_COMMENTED":
    case "COMMENT_REPLIED":
    case "NEW_FOLLOWER":
    case "NEW_BRAND_FOLLOWER":
    case "ACHIEVEMENT_UNLOCKED":
    case "LEVEL_UP":
    case "COMMISSION_EARNED":
    case "NEW_ORDER":
    case "ORDER_STATUS_CHANGED":
    case "WITHDRAW_REQUEST_APPROVED":
    case "WITHDRAW_REQUEST_REJECTED":
    case "WITHDRAW_REQUEST_PAID":
    case "NEW_MESSAGE":
    case "SUPPORT_TICKET_RESOLVED":
      return null;
    default:
      return null;
  }
};
