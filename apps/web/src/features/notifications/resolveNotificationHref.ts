import type { Notification } from "@outfiqe/types";

export const resolveNotificationHref = (
  notification: Notification,
  ownHandle: string | undefined,
): string | null => {
  switch (notification.type) {
    case "LOOK_LIKED":
    case "LOOK_COMMENTED":
    case "COMMENT_REPLIED":
      return ownHandle && notification.entityId
        ? `/creator/${ownHandle}?look=${notification.entityId}`
        : "/profile";
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
    case "SUPPORT_TICKET_REPLY":
    case "SUPPORT_TICKET_RESOLVED":
      return notification.entityId
        ? `/settings/support?ticket=${notification.entityId}`
        : "/settings/support";
    case "SUPPORT_TICKET_CREATED":
    case "SUPPORT_TICKET_ASSIGNED":
      return null;
    default:
      return null;
  }
};
