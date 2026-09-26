import { isExternalNotificationPath } from "@outfiqe/utils";

import type { NotificationBroadcastPayload } from "#events/event-bus.types.js";
import { NotificationSurface, NotificationType } from "#generated/prisma/enums.js";

export type PushMessage = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

const NOTIFICATIONS_PATH = "/notifications";

const SINGLE_ACTOR_COUNT = 1;

type MessageCopy = { title: string; body: (payload: NotificationBroadcastPayload) => string };

const withOthers = (payload: NotificationBroadcastPayload, singular: string): string =>
  payload.actorCount > SINGLE_ACTOR_COUNT
    ? `${payload.actorCount} people ${singular}`
    : `Someone ${singular}`;

const couponCodeFrom = (payload: NotificationBroadcastPayload): string =>
  typeof payload.metadata.couponCode === "string" ? payload.metadata.couponCode : "A coupon";

const organizationNameFrom = (payload: NotificationBroadcastPayload): string =>
  typeof payload.metadata.crmOrganizationName === "string"
    ? payload.metadata.crmOrganizationName
    : "your organization";

const thresholdPercentFrom = (payload: NotificationBroadcastPayload): string =>
  typeof payload.metadata.thresholdPercent === "number"
    ? String(payload.metadata.thresholdPercent)
    : "its";

const COPY_BY_TYPE: Record<NotificationType, MessageCopy> = {
  [NotificationType.LOOK_LIKED]: {
    title: "New like",
    body: (payload) => withOthers(payload, "liked your look"),
  },
  [NotificationType.LOOK_COMMENTED]: {
    title: "New comment",
    body: () => "Someone commented on your look",
  },
  [NotificationType.COMMENT_REPLIED]: {
    title: "New reply",
    body: () => "Someone replied to your comment",
  },
  [NotificationType.NEW_FOLLOWER]: {
    title: "New follower",
    body: (payload) => withOthers(payload, "started following you"),
  },
  [NotificationType.NEW_BRAND_FOLLOWER]: {
    title: "New brand follower",
    body: (payload) => withOthers(payload, "started following your brand"),
  },
  [NotificationType.ACHIEVEMENT_UNLOCKED]: {
    title: "Achievement unlocked",
    body: () => "You earned a new badge",
  },
  [NotificationType.LEVEL_UP]: {
    title: "Level up",
    body: () => "You reached a new level",
  },
  [NotificationType.COMMISSION_EARNED]: {
    title: "You earned a commission",
    body: () => "A sale from one of your looks came through",
  },
  [NotificationType.NEW_ORDER]: {
    title: "New order",
    body: () => "Your brand has a new order",
  },
  [NotificationType.ORDER_STATUS_CHANGED]: {
    title: "Order update",
    body: () => "There's an update on one of your orders",
  },
  [NotificationType.BRAND_APPLICATION_SUBMITTED]: {
    title: "New brand application",
    body: () => "A brand has applied to join Outfiqe",
  },
  [NotificationType.PRODUCT_REVIEWED]: {
    title: "New review",
    body: () => "Someone reviewed one of your products",
  },
  [NotificationType.REVIEW_REQUESTED]: {
    title: "How was it?",
    body: () => "Leave a review for something you bought",
  },
  [NotificationType.WITHDRAW_REQUEST_APPROVED]: {
    title: "Withdrawal approved",
    body: () => "Your withdrawal request was approved",
  },
  [NotificationType.WITHDRAW_REQUEST_REJECTED]: {
    title: "Withdrawal rejected",
    body: () => "Your withdrawal request was rejected",
  },
  [NotificationType.WITHDRAW_REQUEST_PAID]: {
    title: "Withdrawal paid",
    body: () => "Your withdrawal has been paid out",
  },
  [NotificationType.NEW_MESSAGE]: {
    title: "New message",
    body: () => "You have a new message",
  },
  [NotificationType.CRM_ITEM_ASSIGNED]: {
    title: "Assigned to you",
    body: () => "A task or ticket was assigned to you",
  },
  [NotificationType.SUPPORT_TICKET_CREATED]: {
    title: "New support ticket",
    body: () => "A customer opened a support ticket",
  },
  [NotificationType.SUPPORT_TICKET_ASSIGNED]: {
    title: "Support ticket assigned",
    body: () => "A support ticket was assigned to you",
  },
  [NotificationType.SUPPORT_TICKET_REPLY]: {
    title: "Support reply",
    body: () => "There's a new reply on your support ticket",
  },
  [NotificationType.SUPPORT_TICKET_RESOLVED]: {
    title: "Support ticket resolved",
    body: () => "Your support ticket was marked resolved",
  },
  [NotificationType.COUPON_APPROVAL_REQUESTED]: {
    title: "Coupon needs approval",
    body: (payload) => `${couponCodeFrom(payload)} is waiting on your sign-off`,
  },
  [NotificationType.COUPON_BUDGET_ALERT]: {
    title: "Coupon budget alert",
    body: (payload) =>
      `${couponCodeFrom(payload)} has reached ${thresholdPercentFrom(payload)}% of budget`,
  },
  [NotificationType.COUPON_REDEMPTION_FLAGGED]: {
    title: "Coupon redemption flagged",
    body: () => "A coupon redemption was flagged for review",
  },
  [NotificationType.PRODUCT_TAG_SUBMITTED]: {
    title: "Tag waiting for review",
    body: (payload) => withOthers(payload, "tagged one of your products"),
  },
  [NotificationType.PRODUCT_TAG_REVIEW_REMINDER]: {
    title: "Tags waiting for review",
    body: (payload) => {
      const count = payload.metadata.pendingTagReviewCount;
      return typeof count === "number"
        ? `${count} creator tag${count === 1 ? "" : "s"} still need your review`
        : "You have creator tags waiting for review";
    },
  },
  [NotificationType.PRODUCT_TAG_APPROVED]: {
    title: "Product tag approved",
    body: () => "A brand approved a product tag on your look",
  },
  [NotificationType.PRODUCT_TAG_REJECTED]: {
    title: "Product tag declined",
    body: () => "A brand declined a product tag on your look",
  },
  [NotificationType.PRODUCT_TAG_REVOKED]: {
    title: "Product tag removed",
    body: () => "A brand removed a live product tag from your look",
  },
  [NotificationType.ANNOUNCEMENT]: {
    title: "New announcement",
    body: (payload) =>
      typeof payload.metadata.announcementBody === "string"
        ? payload.metadata.announcementBody
        : "You have a new announcement",
  },
  [NotificationType.CRM_TICKET_UNASSIGNED]: {
    title: "New ticket needs an owner",
    body: (payload) => `A new ticket in ${organizationNameFrom(payload)} has no one assigned`,
  },
  [NotificationType.CRM_MEMBER_JOINED]: {
    title: "New team member",
    body: (payload) => `Someone joined ${organizationNameFrom(payload)}`,
  },
  [NotificationType.CRM_INVOICE_DUE]: {
    title: "Subscription renewal due",
    body: (payload) => `The ${organizationNameFrom(payload)} subscription is due for renewal`,
  },
  [NotificationType.CRM_SUBSCRIPTION_PAST_DUE]: {
    title: "Subscription payment overdue",
    body: (payload) => `The ${organizationNameFrom(payload)} subscription payment is overdue`,
  },
  [NotificationType.CRM_SUBSCRIPTION_CANCELED]: {
    title: "Subscription canceled",
    body: (payload) =>
      `The ${organizationNameFrom(payload)} subscription was canceled because it wasn't renewed`,
  },
};

const urlFor = (payload: NotificationBroadcastPayload): string => {
  switch (payload.type) {
    case NotificationType.LOOK_LIKED:
    case NotificationType.LOOK_COMMENTED:
    case NotificationType.COMMENT_REPLIED:
    case NotificationType.NEW_FOLLOWER:
    case NotificationType.NEW_BRAND_FOLLOWER:
      return "/profile";
    case NotificationType.ACHIEVEMENT_UNLOCKED:
      return "/badges";
    case NotificationType.LEVEL_UP:
      return "/progress";
    case NotificationType.COMMISSION_EARNED:
      return "/earnings";
    case NotificationType.NEW_ORDER:
      return "/manage-orders";
    case NotificationType.ORDER_STATUS_CHANGED:
      return payload.entityId ? `/orders/${payload.entityId}` : "/orders";
    case NotificationType.PRODUCT_REVIEWED:
      return "/products";
    case NotificationType.REVIEW_REQUESTED:
      return payload.entityId
        ? `/product/${payload.entityId}?review=write#reviews`
        : NOTIFICATIONS_PATH;
    case NotificationType.WITHDRAW_REQUEST_APPROVED:
    case NotificationType.WITHDRAW_REQUEST_REJECTED:
    case NotificationType.WITHDRAW_REQUEST_PAID:
      return "/wallet";
    case NotificationType.NEW_MESSAGE:
      return "/messages";
    case NotificationType.SUPPORT_TICKET_REPLY:
    case NotificationType.SUPPORT_TICKET_RESOLVED:
      return payload.entityId ? `/support?ticket=${payload.entityId}` : "/support";
    case NotificationType.PRODUCT_TAG_APPROVED:
    case NotificationType.PRODUCT_TAG_REJECTED:
    case NotificationType.PRODUCT_TAG_REVOKED:
      return "/profile";
    default:
      return NOTIFICATIONS_PATH;
  }
};

const webPushUrl = (payload: NotificationBroadcastPayload): string => {
  if (payload.type === NotificationType.ANNOUNCEMENT) {
    return payload.targetPath ?? NOTIFICATIONS_PATH;
  }
  if (payload.targetPath && isExternalNotificationPath(payload.targetPath)) {
    return payload.targetPath;
  }
  return payload.targetSurface === NotificationSurface.WEB && payload.targetPath
    ? payload.targetPath
    : urlFor(payload);
};

export const toPushMessage = (payload: NotificationBroadcastPayload): PushMessage => {
  const copy = COPY_BY_TYPE[payload.type];
  const title =
    payload.type === NotificationType.ANNOUNCEMENT &&
    typeof payload.metadata.announcementTitle === "string"
      ? payload.metadata.announcementTitle
      : copy.title;
  return {
    title,
    body: copy.body(payload),
    url: webPushUrl(payload),
    tag: `${payload.type}:${payload.groupKey ?? payload.entityId ?? payload.id}`,
  };
};
