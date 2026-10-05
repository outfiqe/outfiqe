import {
  ApprovedAccountKind,
  CrmItemKind,
  type Notification,
  NotificationType,
} from "@outfiqe/types";
import { formatActorList } from "@outfiqe/utils";

const actorList = (notification: Notification): string =>
  formatActorList(notification.metadata.recentActors ?? [], notification.actorCount);

const outfitName = (notification: Notification): string => {
  const { outfitTitle } = notification.metadata;
  return outfitTitle ? `"${outfitTitle}"` : "an outfit build";
};

const offerAmount = (notification: Notification): string => {
  const { offerAmount: amount } = notification.metadata;
  return amount === undefined ? "money" : `Rs. ${amount.toLocaleString("en-IN")}`;
};

const SINGLE_SOLD_OUT_ITEM = 1;

const soldOutMessage = (notification: Notification): string => {
  const { productName, soldOutItemCount = SINGLE_SOLD_OUT_ITEM } = notification.metadata;
  const soldOutSubject =
    soldOutItemCount > SINGLE_SOLD_OUT_ITEM
      ? `${soldOutItemCount} items`
      : (productName ?? "An item");
  return `${soldOutSubject} in ${outfitName(notification)} sold out. Swap to lock`;
};

export const resolveNotificationMessage = (notification: Notification): string => {
  const { type, metadata } = notification;

  switch (type) {
    case NotificationType.LOOK_LIKED:
      return `${actorList(notification)} cheriqed your drop`;
    case NotificationType.LOOK_COMMENTED:
      return `${metadata.actor?.name ?? "Someone"} chimed on your drop`;
    case NotificationType.COMMENT_REPLIED:
      return `${metadata.actor?.name ?? "Someone"} replied to your chime`;
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
    case NotificationType.PRODUCT_TAG_SUBMITTED:
      return `${actorList(notification)} tagged one of your products — review it in your queue`;
    case NotificationType.PRODUCT_TAG_REVIEW_REMINDER: {
      const count = metadata.pendingTagReviewCount ?? 0;
      return count === 1
        ? "1 muse tag is still waiting for your review"
        : `${count} muse tags are still waiting for your review`;
    }
    case NotificationType.PRODUCT_TAG_APPROVED:
      return metadata.tagAutoApproved
        ? "A product tag on your look was auto-approved"
        : "A brand approved a product tag on your look";
    case NotificationType.PRODUCT_TAG_REJECTED:
      return metadata.tagRejectionNote
        ? `A brand declined a product tag on your look: ${metadata.tagRejectionNote}`
        : "A brand declined a product tag on your look";
    case NotificationType.PRODUCT_TAG_REVOKED:
      return metadata.tagRejectionNote
        ? `A brand removed a live product tag from your look: ${metadata.tagRejectionNote}`
        : "A brand removed a live product tag from your look";
    case NotificationType.ANNOUNCEMENT:
      return metadata.announcementTitle ?? "New announcement";
    case NotificationType.CRM_TICKET_UNASSIGNED:
      return metadata.crmItemTitle
        ? `New ticket with no one assigned: "${metadata.crmItemTitle}"`
        : "A new ticket has no one assigned";
    case NotificationType.CRM_MEMBER_JOINED:
      return `${metadata.crmMemberName ?? "Someone"} joined ${metadata.crmOrganizationName ?? "your team"}`;
    case NotificationType.CRM_INVOICE_DUE:
      return metadata.crmInvoiceAmount
        ? `Your subscription renewal of Rs. ${metadata.crmInvoiceAmount} is due`
        : "Your subscription renewal is due";
    case NotificationType.CRM_SUBSCRIPTION_PAST_DUE:
      return "Your subscription payment is overdue. Pay now to keep advanced features";
    case NotificationType.CRM_SUBSCRIPTION_CANCELED:
      return "Your subscription was canceled because it wasn't renewed";
    case NotificationType.OUTFIT_BOARD_ACTIVITY:
      return `${actorList(notification)} changed ${outfitName(notification)}`;
    case NotificationType.OUTFIT_READY_TO_LOCK:
      return `Everyone's happy with ${outfitName(notification)}. It's ready to lock`;
    case NotificationType.OUTFIT_LOCKED:
      return `${metadata.actor?.name ?? "The owner"} locked ${outfitName(notification)}`;
    case NotificationType.OUTFIT_INVITED:
      return `${metadata.actor?.name ?? "Someone"} invited you to build ${outfitName(notification)}`;
    case NotificationType.OUTFIT_SHARED:
      return `${metadata.actor?.name ?? "Someone"} shared ${outfitName(notification)} with you`;
    case NotificationType.OUTFIT_MADE_PUBLIC:
      return `${outfitName(notification)} is now public`;
    case NotificationType.OUTFIT_ITEMS_SOLD_OUT:
      return soldOutMessage(notification);
    case NotificationType.OUTFIT_NEW_VERSION_AVAILABLE:
      return `A new version of ${outfitName(notification)} is ready to post as a look`;
    case NotificationType.OUTFIT_OFFER_RECEIVED:
      return `${metadata.brandName ?? "A brand"} offered you ${offerAmount(notification)} to post ${outfitName(notification)}`;
    case NotificationType.OUTFIT_OFFER_ACCEPTED:
      return `${metadata.actor?.name ?? "The creator"} accepted your offer on ${outfitName(notification)}`;
    case NotificationType.OUTFIT_OFFER_DECLINED:
      return `${metadata.actor?.name ?? "The creator"} declined your offer on ${outfitName(notification)}. It will be refunded`;
    case NotificationType.OUTFIT_OFFER_EXPIRED:
      return `The offer on ${outfitName(notification)} ran out of time`;
    case NotificationType.OUTFIT_OFFER_RELEASED:
      return `Your ${offerAmount(notification)} for ${outfitName(notification)} is ready to withdraw`;
    case NotificationType.OUTFIT_OFFER_REFUNDED:
      return `Your ${offerAmount(notification)} offer on ${outfitName(notification)} is being refunded`;
    case NotificationType.ACCOUNT_APPROVED:
      return metadata.approvedAccountKind === ApprovedAccountKind.BRAND
        ? `Welcome to Outfiqe! ${metadata.brandName ?? "Your brand"} is set up. Add your first products to start selling.`
        : "Welcome to Outfiqe! You're now an approved muse. Drop your first look and tag the pieces you're wearing.";
    default:
      return "You have a new notification";
  }
};
