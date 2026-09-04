import type { NotificationBroadcastPayload } from "#events/event-bus.types.js";
import { NotificationType } from "#generated/prisma/enums.js";

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
    default:
      return NOTIFICATIONS_PATH;
  }
};

export const toPushMessage = (payload: NotificationBroadcastPayload): PushMessage => {
  const copy = COPY_BY_TYPE[payload.type];
  return {
    title: copy.title,
    body: copy.body(payload),
    url: urlFor(payload),
    tag: `${payload.type}:${payload.groupKey ?? payload.entityId ?? payload.id}`,
  };
};
