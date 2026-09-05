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
    case "PRODUCT_REVIEWED":
      return `${metadata.actor?.name ?? "Someone"} left a ${metadata.rating ?? ""}-star review on ${metadata.productName ?? "your product"}`;
    case "REVIEW_REQUESTED":
      return `How was ${metadata.productName ?? "your order"}? Leave a review.`;
    case "WITHDRAW_REQUEST_APPROVED":
      return "Your withdrawal request was approved";
    case "WITHDRAW_REQUEST_REJECTED":
      return metadata.rejectionReason
        ? `Your withdrawal request was rejected: ${metadata.rejectionReason}`
        : "Your withdrawal request was rejected";
    case "WITHDRAW_REQUEST_PAID":
      return "Your withdrawal was paid out";
    case "NEW_MESSAGE":
      return metadata.messagePreview ?? "You have a new message";
    case "CRM_ITEM_ASSIGNED": {
      const itemKind = metadata.crmItemKind === "ticket" ? "ticket" : "task";
      return metadata.crmItemTitle
        ? `You were assigned the ${itemKind} "${metadata.crmItemTitle}"`
        : `You were assigned a ${itemKind}`;
    }
    case "SUPPORT_TICKET_CREATED":
      return `New support request: ${metadata.supportSubject ?? "Untitled request"}`;
    case "SUPPORT_TICKET_ASSIGNED":
      return `You were assigned support request: ${metadata.supportSubject ?? "Untitled request"}`;
    case "SUPPORT_TICKET_REPLY":
      return `New reply on your support request${metadata.supportSubject ? `: ${metadata.supportSubject}` : ""}`;
    case "SUPPORT_TICKET_RESOLVED":
      return `Your support request was resolved${metadata.supportSubject ? `: ${metadata.supportSubject}` : ""}`;
    default:
      return "You have a new notification";
  }
};
