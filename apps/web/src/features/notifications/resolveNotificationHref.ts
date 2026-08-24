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
        : "/dashboard/profile";
    case "NEW_FOLLOWER": {
      const actorHandle = notification.metadata.recentActors?.[0]?.handle;
      return actorHandle ? `/creator/${actorHandle}` : "/dashboard/profile";
    }
    case "ACHIEVEMENT_UNLOCKED":
      return "/dashboard/badges";
    case "LEVEL_UP":
      return "/dashboard/progress";
    case "COMMISSION_EARNED":
      return "/dashboard/earnings";
    case "NEW_ORDER":
      return "/dashboard/orders";
    case "ORDER_STATUS_CHANGED":
      return notification.entityId ? `/orders/${notification.entityId}` : "/orders";
    case "NEW_BRAND_FOLLOWER":
      return "/dashboard/profile";
    case "BRAND_APPLICATION_SUBMITTED":
      return null;
    case "PRODUCT_REVIEWED":
      return "/dashboard/products";
    case "REVIEW_REQUESTED":
      return notification.entityId
        ? `/product/${notification.entityId}?review=write#reviews`
        : null;
    default:
      return null;
  }
};
