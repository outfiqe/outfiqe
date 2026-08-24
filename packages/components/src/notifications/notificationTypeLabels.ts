import type { NotificationType } from "@outfiqe/types";

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  LOOK_LIKED: "Likes on your looks",
  LOOK_COMMENTED: "Comments on your looks",
  COMMENT_REPLIED: "Replies to your comments",
  NEW_FOLLOWER: "New followers",
  NEW_BRAND_FOLLOWER: "New brand followers",
  ACHIEVEMENT_UNLOCKED: "Badges unlocked",
  LEVEL_UP: "Level ups",
  COMMISSION_EARNED: "Commissions earned",
  NEW_ORDER: "New orders",
  ORDER_STATUS_CHANGED: "Order status updates",
  BRAND_APPLICATION_SUBMITTED: "New brand applications",
  PRODUCT_REVIEWED: "New product reviews",
  REVIEW_REQUESTED: "Review reminders",
};
