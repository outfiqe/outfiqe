import type { NotificationBroadcastPayload } from "#events/event-bus.types.js";
import type { NotificationEntityType, NotificationSurface } from "#generated/prisma/enums.js";
import { NotificationType } from "#generated/prisma/enums.js";
import { CRM_ASSIGNMENT_VIEW_PERMISSION_KEYS } from "#modules/crm-access/crm-access.constants.js";
import {
  BRAND_REVIEW_PERMISSION_KEYS,
  COUPON_MANAGEMENT_PERMISSION_KEYS,
  SUPPORT_AGENT_PERMISSION_KEYS,
} from "#modules/platform-access/platform-access.constants.js";

import {
  MAX_RECENT_ACTORS,
  TENANT_STAFF_NOTIFICATION_PERMISSIONS,
} from "./notification.constants.js";
import type {
  NotificationActorSnapshot,
  NotificationMembershipGrant,
  NotificationMetadata,
  NotificationRecipientAudience,
  NotificationRecord,
} from "./notification.types.js";

type PrismaNotificationRow = {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  targetSurface: NotificationSurface | null;
  targetPath: string | null;
  organizationId: string | null;
  metadata: unknown;
  groupKey: string | null;
  actorCount: number;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const toNotificationRecord = (row: PrismaNotificationRow): NotificationRecord => ({
  id: row.id,
  recipientId: row.recipientId,
  actorId: row.actorId,
  type: row.type,
  entityType: row.entityType,
  entityId: row.entityId,
  targetSurface: row.targetSurface,
  targetPath: row.targetPath,
  organizationId: row.organizationId,
  metadata: (row.metadata ?? {}) as NotificationMetadata,
  groupKey: row.groupKey,
  actorCount: row.actorCount,
  isRead: row.isRead,
  readAt: row.readAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

type AudienceRule = (audience: NotificationRecipientAudience) => boolean;

const grantHoldsAnyOf = (
  grant: NotificationMembershipGrant,
  permissionKeys: readonly string[],
): boolean => grant.isOwner || permissionKeys.some((key) => grant.permissionKeys.includes(key));

const everyAccount: AudienceRule = () => true;
const storefrontAccounts: AudienceRule = ({ isStaffAccount }) => !isStaffAccount;
const shopperAccounts: AudienceRule = ({ isShopperAccount }) => isShopperAccount;
const approvedCreators: AudienceRule = ({ isApprovedCreator }) => isApprovedCreator;
const businessAccounts: AudienceRule = ({ isBrandMember }) => isBrandMember;
const creatorsAndBusinesses: AudienceRule = (audience) =>
  approvedCreators(audience) || businessAccounts(audience);

const platformStaffHolding =
  (permissionKeys: readonly string[]): AudienceRule =>
  ({ membershipGrants }) =>
    membershipGrants.some(
      (grant) => grant.isPlatformOrganization && grantHoldsAnyOf(grant, permissionKeys),
    );

const organizationStaffHolding =
  (permissionKeys: readonly string[]): AudienceRule =>
  ({ membershipGrants }) =>
    membershipGrants.some((grant) => grantHoldsAnyOf(grant, permissionKeys));

const RECEIVING_AUDIENCE_BY_TYPE: Record<NotificationType, AudienceRule> = {
  [NotificationType.LOOK_LIKED]: approvedCreators,
  [NotificationType.LOOK_COMMENTED]: approvedCreators,
  [NotificationType.COMMENT_REPLIED]: storefrontAccounts,
  [NotificationType.NEW_FOLLOWER]: approvedCreators,
  [NotificationType.NEW_BRAND_FOLLOWER]: businessAccounts,
  [NotificationType.ACHIEVEMENT_UNLOCKED]: storefrontAccounts,
  [NotificationType.LEVEL_UP]: storefrontAccounts,
  [NotificationType.COMMISSION_EARNED]: approvedCreators,
  [NotificationType.NEW_ORDER]: businessAccounts,
  [NotificationType.ORDER_STATUS_CHANGED]: shopperAccounts,
  [NotificationType.BRAND_APPLICATION_SUBMITTED]: platformStaffHolding(
    BRAND_REVIEW_PERMISSION_KEYS,
  ),
  [NotificationType.PRODUCT_REVIEWED]: businessAccounts,
  [NotificationType.REVIEW_REQUESTED]: shopperAccounts,
  [NotificationType.WITHDRAW_REQUEST_APPROVED]: creatorsAndBusinesses,
  [NotificationType.WITHDRAW_REQUEST_REJECTED]: creatorsAndBusinesses,
  [NotificationType.WITHDRAW_REQUEST_PAID]: creatorsAndBusinesses,
  [NotificationType.NEW_MESSAGE]: everyAccount,
  [NotificationType.CRM_ITEM_ASSIGNED]: organizationStaffHolding(
    CRM_ASSIGNMENT_VIEW_PERMISSION_KEYS,
  ),
  [NotificationType.SUPPORT_TICKET_CREATED]: platformStaffHolding(SUPPORT_AGENT_PERMISSION_KEYS),
  [NotificationType.SUPPORT_TICKET_ASSIGNED]: platformStaffHolding(SUPPORT_AGENT_PERMISSION_KEYS),
  [NotificationType.SUPPORT_TICKET_REPLY]: (audience) =>
    storefrontAccounts(audience) || platformStaffHolding(SUPPORT_AGENT_PERMISSION_KEYS)(audience),
  [NotificationType.SUPPORT_TICKET_RESOLVED]: storefrontAccounts,
  [NotificationType.COUPON_APPROVAL_REQUESTED]: platformStaffHolding(
    COUPON_MANAGEMENT_PERMISSION_KEYS,
  ),
  [NotificationType.COUPON_BUDGET_ALERT]: platformStaffHolding(COUPON_MANAGEMENT_PERMISSION_KEYS),
  [NotificationType.COUPON_REDEMPTION_FLAGGED]: platformStaffHolding(
    COUPON_MANAGEMENT_PERMISSION_KEYS,
  ),
  [NotificationType.PRODUCT_TAG_SUBMITTED]: businessAccounts,
  [NotificationType.PRODUCT_TAG_APPROVED]: approvedCreators,
  [NotificationType.PRODUCT_TAG_REJECTED]: approvedCreators,
  [NotificationType.PRODUCT_TAG_REVOKED]: approvedCreators,
  [NotificationType.PRODUCT_TAG_REVIEW_REMINDER]: businessAccounts,
  [NotificationType.ANNOUNCEMENT]: everyAccount,
  [NotificationType.CRM_TICKET_UNASSIGNED]: organizationStaffHolding(
    TENANT_STAFF_NOTIFICATION_PERMISSIONS[NotificationType.CRM_TICKET_UNASSIGNED],
  ),
  [NotificationType.CRM_MEMBER_JOINED]: organizationStaffHolding(
    TENANT_STAFF_NOTIFICATION_PERMISSIONS[NotificationType.CRM_MEMBER_JOINED],
  ),
  [NotificationType.CRM_INVOICE_DUE]: organizationStaffHolding(
    TENANT_STAFF_NOTIFICATION_PERMISSIONS[NotificationType.CRM_INVOICE_DUE],
  ),
  [NotificationType.CRM_SUBSCRIPTION_PAST_DUE]: organizationStaffHolding(
    TENANT_STAFF_NOTIFICATION_PERMISSIONS[NotificationType.CRM_SUBSCRIPTION_PAST_DUE],
  ),
  [NotificationType.CRM_SUBSCRIPTION_CANCELED]: organizationStaffHolding(
    TENANT_STAFF_NOTIFICATION_PERMISSIONS[NotificationType.CRM_SUBSCRIPTION_CANCELED],
  ),
};

export const canReceiveNotificationType = (
  type: NotificationType,
  audience: NotificationRecipientAudience,
): boolean => RECEIVING_AUDIENCE_BY_TYPE[type](audience);

export const buildNotificationDedupeKey = (
  sourceEventId: string,
  type: NotificationType,
  entityId: string | null | undefined,
): string => [sourceEventId, type, entityId ?? ""].join("|");

export const mergeRecentActors = (
  existing: NotificationActorSnapshot[],
  newActor: NotificationActorSnapshot,
  cap: number = MAX_RECENT_ACTORS,
): NotificationActorSnapshot[] => {
  const deduped = existing.filter((actor) => actor.id !== newActor.id);
  return [newActor, ...deduped].slice(0, cap);
};

export const removeRecentActor = (
  existing: NotificationActorSnapshot[],
  actorId: string,
): NotificationActorSnapshot[] => existing.filter((actor) => actor.id !== actorId);

export const toBroadcastPayload = (record: NotificationRecord): NotificationBroadcastPayload => ({
  id: record.id,
  recipientId: record.recipientId,
  actorId: record.actorId,
  type: record.type,
  entityType: record.entityType,
  entityId: record.entityId,
  targetSurface: record.targetSurface,
  targetPath: record.targetPath,
  organizationId: record.organizationId,
  metadata: record.metadata,
  groupKey: record.groupKey,
  actorCount: record.actorCount,
  isRead: record.isRead,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
