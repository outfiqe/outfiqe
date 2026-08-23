import type { Notification } from "@outfiqe/types";
import { formatActorList } from "@outfiqe/utils";

const actorList = (notification: Notification): string =>
  formatActorList(notification.metadata.recentActors ?? [], notification.actorCount);

export const resolveNotificationMessage = (notification: Notification): string => {
  const { type, metadata } = notification;

  switch (type) {
    case "LOOK_LIKED":
      return `${actorList(notification)} liked your look`;
    case "LOOK_COMMENTED":
      return `${metadata.actor?.name ?? "Someone"} commented on your look`;
    case "COMMENT_REPLIED":
      return `${metadata.actor?.name ?? "Someone"} replied to your comment`;
    case "NEW_FOLLOWER":
      return `${actorList(notification)} started following you`;
    case "NEW_BRAND_FOLLOWER":
      return `${actorList(notification)} started following your brand`;
    case "ACHIEVEMENT_UNLOCKED":
      return `You unlocked the "${metadata.badgeName ?? "badge"}" badge`;
    case "LEVEL_UP":
      return `You leveled up to ${metadata.levelName ?? "the next level"}`;
    case "COMMISSION_EARNED":
      return "You earned a new commission";
    case "NEW_ORDER":
      return "You received a new order";
    case "ORDER_STATUS_CHANGED":
      return `Your order was ${(metadata.status ?? "updated").toLowerCase()}`;
    case "BRAND_APPLICATION_SUBMITTED":
      return `${metadata.brandName ?? "A brand"} submitted an application`;
    default:
      return "You have a new notification";
  }
};
