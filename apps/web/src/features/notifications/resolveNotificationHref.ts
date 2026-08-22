import type { Notification } from "@outfiqe/types";

/**
 * type -> route, web surface (creator, business, and any authenticated
 * customer). Everything it needs is already denormalized onto the
 * notification itself (plan §9 — never a precomputed URL, but a resolver
 * built from entityType/entityId/metadata) — `ownHandle` is the one
 * exception, needed to link into the current user's own profile grid.
 *
 * LOOK_LIKED/LOOK_COMMENTED deep-link into the exact post via
 * /creator/{handle}?look={lookId} — CreatorProfile.tsx opens
 * PostDetailModal for that id directly, fetching it if it isn't already in
 * the loaded grid page (see creator-profile/README.md).
 */
export const resolveNotificationHref = (
  notification: Notification,
  ownHandle: string | undefined,
): string | null => {
  switch (notification.type) {
    case "LOOK_LIKED":
    case "LOOK_COMMENTED":
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
    default:
      return null;
  }
};
