import { CrmItemKind, type Notification, NotificationType } from "@outfiqe/types";
import { formatActorList } from "@outfiqe/utils";

const actorList = (notification: Notification): string =>
  formatActorList(notification.metadata.recentActors ?? [], notification.actorCount);

export const resolveNotificationMessage = (notification: Notification): string => {
  const { type, metadata } = notification;

  switch (type) {
    case NotificationType.LOOK_LIKED:
      return `${actorList(notification)} liked your look`;
    case NotificationType.LOOK_COMMENTED:
      return `${metadata.actor?.name ?? "Someone"} commented on your look`;
    case NotificationType.COMMENT_REPLIED:
      return `${metadata.actor?.name ?? "Someone"} replied to your comment`;
    case NotificationType.NEW_FOLLOWER:
      return `${actorList(notification)} started following you`;
    case NotificationType.NEW_BRAND_FOLLOWER:
      return `${actorList(notification)} started following your brand`;
    case NotificationType.ACHIEVEMENT_UNLOCKED:
      return `You unlocked the "${metadata.badgeName ?? "badge"}" badge`;
    case NotificationType.LEVEL_UP:
      return `You leveled up to ${metadata.levelName ?? "the next level"}`;
    case NotificationType.COMMISSION_EARNED:
      return "You earned a new commission";
    case NotificationType.NEW_ORDER:
      return "You received a new order";
    case NotificationType.ORDER_STATUS_CHANGED:
      return `Your order was ${(metadata.status ?? "updated").toLowerCase()}`;
    case NotificationType.BRAND_APPLICATION_SUBMITTED:
      return `${metadata.brandName ?? "A brand"} submitted an application`;
    case NotificationType.PRODUCT_REVIEWED:
      return `${metadata.actor?.name ?? "Someone"} left a ${metadata.rating ?? ""}-star review on ${metadata.productName ?? "your product"}`;
    case NotificationType.REVIEW_REQUESTED:
      return `How was ${metadata.productName ?? "your order"}? Leave a review.`;
    case NotificationType.WITHDRAW_REQUEST_APPROVED:
      return "Your withdrawal request was approved";
    case NotificationType.WITHDRAW_REQUEST_REJECTED:
      return metadata.rejectionReason
        ? `Your withdrawal request was rejected: ${metadata.rejectionReason}`
        : "Your withdrawal request was rejected";
    case NotificationType.WITHDRAW_REQUEST_PAID:
      return "Your withdrawal was paid out";
    case NotificationType.NEW_MESSAGE:
      return metadata.messagePreview ?? "You have a new message";
    case NotificationType.CRM_ITEM_ASSIGNED: {
      const itemKind = metadata.crmItemKind === CrmItemKind.TICKET ? "ticket" : "task";
      return metadata.crmItemTitle
        ? `You were assigned the ${itemKind} "${metadata.crmItemTitle}"`
        : `You were assigned a ${itemKind}`;
    }
    case NotificationType.SUPPORT_TICKET_CREATED:
      return `New support request: ${metadata.supportSubject ?? "Untitled request"}`;
    case NotificationType.SUPPORT_TICKET_ASSIGNED:
      return `You were assigned support request: ${metadata.supportSubject ?? "Untitled request"}`;
    case NotificationType.SUPPORT_TICKET_REPLY:
      return `New reply on your support request${metadata.supportSubject ? `: ${metadata.supportSubject}` : ""}`;
    case NotificationType.SUPPORT_TICKET_RESOLVED:
      return `Your support request was resolved${metadata.supportSubject ? `: ${metadata.supportSubject}` : ""}`;
    case NotificationType.COUPON_APPROVAL_REQUESTED:
      return `${metadata.couponCode ?? "A coupon"} is waiting on your approval`;
    case NotificationType.COUPON_BUDGET_ALERT:
      return metadata.thresholdPercent
        ? `${metadata.couponCode ?? "A coupon"} has used ${metadata.thresholdPercent}% of its budget`
        : `${metadata.couponCode ?? "A coupon"} is close to its budget limit`;
    case NotificationType.COUPON_REDEMPTION_FLAGGED:
      return "A coupon redemption was flagged for review";
    default:
      return "You have a new notification";
  }
};
