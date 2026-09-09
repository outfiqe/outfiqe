export const NotificationType = {
  LOOK_LIKED: "LOOK_LIKED",
  LOOK_COMMENTED: "LOOK_COMMENTED",
  COMMENT_REPLIED: "COMMENT_REPLIED",
  NEW_FOLLOWER: "NEW_FOLLOWER",
  NEW_BRAND_FOLLOWER: "NEW_BRAND_FOLLOWER",
  ACHIEVEMENT_UNLOCKED: "ACHIEVEMENT_UNLOCKED",
  LEVEL_UP: "LEVEL_UP",
  COMMISSION_EARNED: "COMMISSION_EARNED",
  NEW_ORDER: "NEW_ORDER",
  ORDER_STATUS_CHANGED: "ORDER_STATUS_CHANGED",
  BRAND_APPLICATION_SUBMITTED: "BRAND_APPLICATION_SUBMITTED",
  PRODUCT_REVIEWED: "PRODUCT_REVIEWED",
  REVIEW_REQUESTED: "REVIEW_REQUESTED",
  WITHDRAW_REQUEST_APPROVED: "WITHDRAW_REQUEST_APPROVED",
  WITHDRAW_REQUEST_REJECTED: "WITHDRAW_REQUEST_REJECTED",
  WITHDRAW_REQUEST_PAID: "WITHDRAW_REQUEST_PAID",
  NEW_MESSAGE: "NEW_MESSAGE",
  CRM_ITEM_ASSIGNED: "CRM_ITEM_ASSIGNED",
  SUPPORT_TICKET_CREATED: "SUPPORT_TICKET_CREATED",
  SUPPORT_TICKET_ASSIGNED: "SUPPORT_TICKET_ASSIGNED",
  SUPPORT_TICKET_REPLY: "SUPPORT_TICKET_REPLY",
  SUPPORT_TICKET_RESOLVED: "SUPPORT_TICKET_RESOLVED",
  COUPON_APPROVAL_REQUESTED: "COUPON_APPROVAL_REQUESTED",
  COUPON_BUDGET_ALERT: "COUPON_BUDGET_ALERT",
  COUPON_REDEMPTION_FLAGGED: "COUPON_REDEMPTION_FLAGGED",
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationEntityType = {
  LOOK: "LOOK",
  USER: "USER",
  ORDER: "ORDER",
  BRAND_APPLICATION: "BRAND_APPLICATION",
  BADGE: "BADGE",
  PRODUCT: "PRODUCT",
  WITHDRAW_REQUEST: "WITHDRAW_REQUEST",
  COUPON: "COUPON",
  CONVERSATION: "CONVERSATION",
  CRM_TASK: "CRM_TASK",
  CRM_TICKET: "CRM_TICKET",
  SUPPORT_TICKET: "SUPPORT_TICKET",
} as const;

export type NotificationEntityType =
  (typeof NotificationEntityType)[keyof typeof NotificationEntityType];

export const CrmItemKind = {
  TASK: "task",
  TICKET: "ticket",
} as const;

export type CrmItemKind = (typeof CrmItemKind)[keyof typeof CrmItemKind];

export const NotificationSurface = {
  WEB: "WEB",
  ADMIN: "ADMIN",
} as const;

export type NotificationSurface = (typeof NotificationSurface)[keyof typeof NotificationSurface];

export type RecentActor = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  isCreator?: boolean;
  brandId?: string | null;
};

export type NotificationMetadata = {
  actor?: RecentActor;
  recentActors?: RecentActor[];
  lookImageUrl?: string;
  lookCaption?: string | null;
  lookOwnerHandle?: string;
  badgeName?: string;
  badgeIcon?: string;
  xpReward?: number;
  levelName?: string;
  levelIcon?: string | null;
  commissionAmount?: number;
  orderTotal?: number;
  brandName?: string;
  status?: string;
  productName?: string;
  productImageUrl?: string | null;
  rating?: number;
  withdrawAmount?: number;
  rejectionReason?: string;
  messagePreview?: string;
  crmItemKind?: CrmItemKind;
  crmItemTitle?: string;
  supportSubject?: string;
  couponCode?: string;
  totalBudgetAmount?: number;
  spentAmount?: number;
  thresholdPercent?: number;
  flagReason?: string;
};

export type Notification = {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  targetSurface: NotificationSurface | null;
  targetPath: string | null;
  metadata: NotificationMetadata;
  groupKey: string | null;
  actorCount: number;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationPage = {
  notifications: Notification[];
  nextCursor: string | null;
};

export type NotificationPreference = {
  type: NotificationType;
  enabled: boolean;
  pushEnabled: boolean;
};

export type NotificationChannelChanges = {
  enabled?: boolean;
  pushEnabled?: boolean;
};
