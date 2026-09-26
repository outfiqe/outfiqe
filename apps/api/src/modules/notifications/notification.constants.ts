import { NotificationType } from "#generated/prisma/enums.js";
import {
  BILLING_MANAGEMENT_PERMISSION_KEYS,
  MEMBER_MANAGEMENT_PERMISSION_KEYS,
  TICKET_ASSIGNMENT_PERMISSION_KEYS,
} from "#modules/crm-access/crm-access.constants.js";
import {
  BRAND_REVIEW_PERMISSION_KEYS,
  COUPON_MANAGEMENT_PERMISSION_KEYS,
  SUPPORT_AGENT_PERMISSION_KEYS,
} from "#modules/platform-access/platform-access.constants.js";

export const PLATFORM_STAFF_NOTIFICATION_PERMISSIONS = {
  [NotificationType.BRAND_APPLICATION_SUBMITTED]: BRAND_REVIEW_PERMISSION_KEYS,
  [NotificationType.SUPPORT_TICKET_CREATED]: SUPPORT_AGENT_PERMISSION_KEYS,
  [NotificationType.SUPPORT_TICKET_REPLY]: SUPPORT_AGENT_PERMISSION_KEYS,
  [NotificationType.COUPON_APPROVAL_REQUESTED]: COUPON_MANAGEMENT_PERMISSION_KEYS,
  [NotificationType.COUPON_REDEMPTION_FLAGGED]: COUPON_MANAGEMENT_PERMISSION_KEYS,
  [NotificationType.COUPON_BUDGET_ALERT]: COUPON_MANAGEMENT_PERMISSION_KEYS,
} as const satisfies Partial<Record<NotificationType, readonly string[]>>;

export const TENANT_STAFF_NOTIFICATION_PERMISSIONS = {
  [NotificationType.CRM_TICKET_UNASSIGNED]: TICKET_ASSIGNMENT_PERMISSION_KEYS,
  [NotificationType.CRM_MEMBER_JOINED]: MEMBER_MANAGEMENT_PERMISSION_KEYS,
  [NotificationType.CRM_INVOICE_DUE]: BILLING_MANAGEMENT_PERMISSION_KEYS,
  [NotificationType.CRM_SUBSCRIPTION_PAST_DUE]: BILLING_MANAGEMENT_PERMISSION_KEYS,
  [NotificationType.CRM_SUBSCRIPTION_CANCELED]: BILLING_MANAGEMENT_PERMISSION_KEYS,
} as const satisfies Partial<Record<NotificationType, readonly string[]>>;

export const PLATFORM_STAFF_ONLY_NOTIFICATION_PERMISSIONS = {
  [NotificationType.BRAND_APPLICATION_SUBMITTED]: BRAND_REVIEW_PERMISSION_KEYS,
  [NotificationType.SUPPORT_TICKET_CREATED]: SUPPORT_AGENT_PERMISSION_KEYS,
  [NotificationType.SUPPORT_TICKET_ASSIGNED]: SUPPORT_AGENT_PERMISSION_KEYS,
  [NotificationType.COUPON_APPROVAL_REQUESTED]: COUPON_MANAGEMENT_PERMISSION_KEYS,
  [NotificationType.COUPON_REDEMPTION_FLAGGED]: COUPON_MANAGEMENT_PERMISSION_KEYS,
  [NotificationType.COUPON_BUDGET_ALERT]: COUPON_MANAGEMENT_PERMISSION_KEYS,
} as const satisfies Partial<Record<NotificationType, readonly string[]>>;

export type PlatformStaffNotificationType = keyof typeof PLATFORM_STAFF_NOTIFICATION_PERMISSIONS;
export type TenantStaffNotificationType = keyof typeof TENANT_STAFF_NOTIFICATION_PERMISSIONS;

export const GROUPABLE_NOTIFICATION_TYPES: ReadonlySet<NotificationType> = new Set([
  NotificationType.LOOK_LIKED,
  NotificationType.NEW_FOLLOWER,
  NotificationType.NEW_BRAND_FOLLOWER,
]);

export const MAX_RECENT_ACTORS = 3;

export const NOTIFICATION_CONSUMER_GROUP = "notification-write";
export const NOTIFICATION_SOCKET_CONSUMER_GROUP = "socket-broadcast";

export const CRITICAL_RETENTION_NOTIFICATION_TYPES: ReadonlySet<NotificationType> = new Set([
  NotificationType.NEW_ORDER,
  NotificationType.ORDER_STATUS_CHANGED,
  NotificationType.COMMISSION_EARNED,
  NotificationType.BRAND_APPLICATION_SUBMITTED,
  NotificationType.CRM_INVOICE_DUE,
  NotificationType.CRM_SUBSCRIPTION_PAST_DUE,
  NotificationType.CRM_SUBSCRIPTION_CANCELED,
]);

export const STANDARD_READ_RETENTION_DAYS = 90;
export const CRITICAL_READ_RETENTION_DAYS = 180;
export const NOTIFICATION_RETENTION_SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const NOTIFICATION_GROUP_KEYS = {
  lookLiked: (lookId: string): string => `look-liked:${lookId}`,
  newFollower: (): string => "new-follower",
  newBrandFollower: (): string => "new-brand-follower",
  tagReviewQueue: (brandId: string): string => `tag-review-queue:${brandId}`,
  tagReviewReminder: (brandId: string): string => `tag-review-reminder:${brandId}`,
} as const;
