import type { Notification } from "@outfiqe/types";

/**
 * type -> route, web surface (creator, business, and any authenticated
 * customer). Pure: everything it needs is already denormalized onto the
 * notification itself (plan §9 — never a precomputed URL, but a resolver
 * built from entityType/entityId/metadata).
 *
 * LOOK_LIKED/LOOK_COMMENTED route to the creator's own dashboard profile,
 * not a per-look page — apps/web has no per-look detail route yet (looks
 * only render inline in the creator profile grid/explore feed).
 */
export const resolveNotificationHref = (notification: Notification): string | null => {
  switch (notification.type) {
    case "LOOK_LIKED":
    case "LOOK_COMMENTED":
      return "/dashboard/profile";
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
    default:
      return null;
  }
};
