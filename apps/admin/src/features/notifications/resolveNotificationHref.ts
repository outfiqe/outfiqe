import type { Notification } from "@outfiqe/types";

/**
 * type -> route, admin surface. Admin only ever receives
 * BRAND_APPLICATION_SUBMITTED (plan §5) — every other type is unreachable
 * here, listed explicitly rather than a default case so a future admin-facing
 * type is a deliberate addition to this switch, not a silent fallthrough.
 */
export const resolveNotificationHref = (notification: Notification): "/" | null => {
  switch (notification.type) {
    case "BRAND_APPLICATION_SUBMITTED":
      return "/";
    case "LOOK_LIKED":
    case "LOOK_COMMENTED":
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
