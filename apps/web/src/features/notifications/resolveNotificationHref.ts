import {
  CrmItemKind,
  type Notification,
  NotificationSurface,
  NotificationType,
} from "@outfiqe/types";

import { ADMIN_URL } from "@/features/auth/utils/getDefaultRoute";
import { lookPermalinkPath } from "@/features/explore";

import {
  ADMIN_APP_ROUTES,
  adminSupportTicketPath,
  conversationPath,
  creatorProfilePath,
  customerSupportTicketPath,
  orderDetailPath,
  productReviewPath,
  WEB_NOTIFICATION_ROUTES,
} from "./notificationRoutes";

const adminAppPath = (path: string): string => `${ADMIN_URL}${path}`;

export const resolveNotificationHref = (
  notification: Notification,
  ownHandle: string | undefined,
  isAdmin = false,
): string | null => {
  const { metadata, entityId } = notification;

  switch (notification.type) {
    case NotificationType.LOOK_LIKED:
    case NotificationType.LOOK_COMMENTED:
      return ownHandle && entityId
        ? lookPermalinkPath(ownHandle, entityId)
        : WEB_NOTIFICATION_ROUTES.dashboardProfile;
    case NotificationType.COMMENT_REPLIED: {
      const lookHandle = metadata.lookOwnerHandle ?? metadata.actor?.handle;
      return lookHandle && entityId
        ? lookPermalinkPath(lookHandle, entityId)
        : WEB_NOTIFICATION_ROUTES.dashboardProfile;
    }
    case NotificationType.NEW_FOLLOWER: {
      const follower = metadata.recentActors?.[0];
      return follower?.isCreator && follower.handle
        ? creatorProfilePath(follower.handle)
        : WEB_NOTIFICATION_ROUTES.dashboardProfile;
    }
    case NotificationType.ACHIEVEMENT_UNLOCKED:
      return WEB_NOTIFICATION_ROUTES.badges;
    case NotificationType.LEVEL_UP:
      return WEB_NOTIFICATION_ROUTES.progress;
    case NotificationType.COMMISSION_EARNED:
      return WEB_NOTIFICATION_ROUTES.earnings;
    case NotificationType.NEW_ORDER:
      return WEB_NOTIFICATION_ROUTES.manageOrders;
    case NotificationType.ORDER_STATUS_CHANGED:
      return entityId
        ? orderDetailPath(WEB_NOTIFICATION_ROUTES.ordersList, entityId)
        : WEB_NOTIFICATION_ROUTES.ordersList;
    case NotificationType.NEW_BRAND_FOLLOWER:
      return WEB_NOTIFICATION_ROUTES.dashboardProfile;
    case NotificationType.PRODUCT_REVIEWED:
      return WEB_NOTIFICATION_ROUTES.brandProducts;
    case NotificationType.REVIEW_REQUESTED:
      return entityId ? productReviewPath(entityId) : null;
    case NotificationType.WITHDRAW_REQUEST_APPROVED:
    case NotificationType.WITHDRAW_REQUEST_REJECTED:
    case NotificationType.WITHDRAW_REQUEST_PAID:
      return WEB_NOTIFICATION_ROUTES.wallet;
    case NotificationType.NEW_MESSAGE:
      return entityId ? conversationPath(entityId) : WEB_NOTIFICATION_ROUTES.messagesList;
    case NotificationType.SUPPORT_TICKET_REPLY:
    case NotificationType.SUPPORT_TICKET_RESOLVED:
      return isAdmin
        ? adminSupportTicketPath(ADMIN_URL, entityId)
        : customerSupportTicketPath(entityId);
    case NotificationType.BRAND_APPLICATION_SUBMITTED:
      return adminAppPath(ADMIN_APP_ROUTES.brandApplications);
    case NotificationType.SUPPORT_TICKET_CREATED:
    case NotificationType.SUPPORT_TICKET_ASSIGNED:
      return adminSupportTicketPath(ADMIN_URL, entityId);
    case NotificationType.CRM_ITEM_ASSIGNED:
      return adminAppPath(
        metadata.crmItemKind === CrmItemKind.TASK
          ? ADMIN_APP_ROUTES.crmTasks
          : ADMIN_APP_ROUTES.crmSupport,
      );
    case NotificationType.COUPON_APPROVAL_REQUESTED:
    case NotificationType.COUPON_BUDGET_ALERT:
      return adminAppPath(ADMIN_APP_ROUTES.coupons);
    case NotificationType.COUPON_REDEMPTION_FLAGGED:
      return entityId
        ? adminAppPath(orderDetailPath(ADMIN_APP_ROUTES.ordersList, entityId))
        : adminAppPath(ADMIN_APP_ROUTES.coupons);
    default:
      return null;
  }
};

export const isFullPageNavHref = (href: string): boolean =>
  /^https?:\/\//.test(href) || href === ADMIN_URL || href.startsWith(`${ADMIN_URL}/`);

export type NotificationNavigation = { href: string; fullPage: boolean };

const TYPES_RESOLVED_FROM_CURRENT_LOGIC = new Set<NotificationType>([
  NotificationType.NEW_FOLLOWER,
  NotificationType.COMMENT_REPLIED,
]);

export const resolveNotificationNavigation = (
  notification: Notification,
  ownHandle: string | undefined,
  isAdmin: boolean,
): NotificationNavigation | null => {
  const ignoreStoredTarget = TYPES_RESOLVED_FROM_CURRENT_LOGIC.has(notification.type);

  if (notification.targetPath && !ignoreStoredTarget) {
    return notification.targetSurface === NotificationSurface.WEB
      ? { href: notification.targetPath, fullPage: false }
      : { href: `${ADMIN_URL}${notification.targetPath}`, fullPage: true };
  }

  const legacyHref = resolveNotificationHref(notification, ownHandle, isAdmin);
  if (!legacyHref) return null;
  return { href: legacyHref, fullPage: isFullPageNavHref(legacyHref) };
};
