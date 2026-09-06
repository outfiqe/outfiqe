import type { Notification } from "@outfiqe/types";

import { lookPermalinkPath } from "@/features/explore";

export const resolveNotificationHref = (
  notification: Notification,
  ownHandle: string | undefined,
): string | null => {
  switch (notification.type) {
    case "LOOK_LIKED":
    case "LOOK_COMMENTED":
      return ownHandle && notification.entityId
        ? lookPermalinkPath(ownHandle, notification.entityId)
        : "/profile";
    case "COMMENT_REPLIED": {
      const { lookOwnerHandle } = notification.metadata;
      return lookOwnerHandle && notification.entityId
        ? lookPermalinkPath(lookOwnerHandle, notification.entityId)
        : null;
    }
    case "NEW_FOLLOWER": {
      const actorHandle = notification.metadata.recentActors?.[0]?.handle;
      return actorHandle ? `/creator/${actorHandle}` : "/profile";
    }
    case "ACHIEVEMENT_UNLOCKED":
      return "/badges";
    case "LEVEL_UP":
      return "/progress";
    case "COMMISSION_EARNED":
      return "/earnings";
    case "NEW_ORDER":
      return "/manage-orders";
    case "ORDER_STATUS_CHANGED":
      return notification.entityId ? `/orders/${notification.entityId}` : "/orders";
    case "NEW_BRAND_FOLLOWER":
      return "/profile";
    case "BRAND_APPLICATION_SUBMITTED":
      return null;
    case "PRODUCT_REVIEWED":
      return "/products";
    case "REVIEW_REQUESTED":
      return notification.entityId
        ? `/product/${notification.entityId}?review=write#reviews`
        : null;
    case "WITHDRAW_REQUEST_APPROVED":
    case "WITHDRAW_REQUEST_REJECTED":
    case "WITHDRAW_REQUEST_PAID":
      return "/wallet";
    case "NEW_MESSAGE":
      return notification.entityId ? `/messages/${notification.entityId}` : "/messages";
    case "CRM_ITEM_ASSIGNED":
      return null;
    case "SUPPORT_TICKET_REPLY":
    case "SUPPORT_TICKET_RESOLVED":
      return notification.entityId ? `/support?ticket=${notification.entityId}` : "/support";
    case "SUPPORT_TICKET_CREATED":
    case "SUPPORT_TICKET_ASSIGNED":
      return null;
    default:
      return null;
  }
};
