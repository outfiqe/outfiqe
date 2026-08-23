import type { Notification } from "@outfiqe/types";

export const resolveNotificationHref = (notification: Notification): "/" | null => {
  switch (notification.type) {
    case "BRAND_APPLICATION_SUBMITTED":
      return "/";
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
      return null;
    default:
      return null;
  }
};
