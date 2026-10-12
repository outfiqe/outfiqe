import { CrmItemKind, type Notification, NotificationType } from "@outfiqe/types";

export type AdminNotificationTarget =
  | { to: "/platform/brand-applications" }
  | { to: "/support" }
  | { to: "/support/$ticketId"; params: { ticketId: string } }
  | { to: "/crm/tasks" }
  | { to: "/crm/support" }
  | { to: "/coupons" }
  | { to: "/orders/$orderId"; params: { orderId: string } };

const supportTicketTarget = (ticketId: string | null): AdminNotificationTarget =>
  ticketId ? { to: "/support/$ticketId", params: { ticketId } } : { to: "/support" };

export const resolveNotificationHref = (
  notification: Notification,
): AdminNotificationTarget | null => {
  const { metadata, entityId } = notification;

  switch (notification.type) {
    case NotificationType.BRAND_APPLICATION_SUBMITTED:
      return { to: "/platform/brand-applications" };
    case NotificationType.SUPPORT_TICKET_CREATED:
    case NotificationType.SUPPORT_TICKET_ASSIGNED:
    case NotificationType.SUPPORT_TICKET_REPLY:
    case NotificationType.SUPPORT_TICKET_RESOLVED:
      return supportTicketTarget(entityId);
    case NotificationType.CRM_ITEM_ASSIGNED:
      return metadata.crmItemKind === CrmItemKind.TASK
        ? { to: "/crm/tasks" }
        : { to: "/crm/support" };
    case NotificationType.COUPON_APPROVAL_REQUESTED:
    case NotificationType.COUPON_BUDGET_ALERT:
      return { to: "/coupons" };
    case NotificationType.COUPON_REDEMPTION_FLAGGED:
      return entityId
        ? { to: "/orders/$orderId", params: { orderId: entityId } }
        : { to: "/coupons" };
    case NotificationType.LOOK_LIKED:
    case NotificationType.LOOK_COMMENTED:
    case NotificationType.COMMENT_REPLIED:
    case NotificationType.NEW_FOLLOWER:
    case NotificationType.NEW_BRAND_FOLLOWER:
    case NotificationType.ACHIEVEMENT_UNLOCKED:
    case NotificationType.LEVEL_UP:
    case NotificationType.COMMISSION_EARNED:
    case NotificationType.NEW_ORDER:
    case NotificationType.ORDER_STATUS_CHANGED:
    case NotificationType.WITHDRAW_REQUEST_APPROVED:
    case NotificationType.WITHDRAW_REQUEST_REJECTED:
    case NotificationType.WITHDRAW_REQUEST_PAID:
    case NotificationType.NEW_MESSAGE:
    case NotificationType.PRODUCT_REVIEWED:
    case NotificationType.REVIEW_REQUESTED:
      return null;
    default:
      return null;
  }
};
