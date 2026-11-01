import { CrmAuditAction } from "#generated/prisma/enums.js";

export const AUDIT_READ_PERMISSION_KEY = "audit:read";

export const DEFAULT_AUDIT_PAGE_SIZE = 25;
export const MAX_AUDIT_PAGE_SIZE = 100;
export const MAX_AUDIT_EXPORT_ROWS = 5000;

export const AUDIT_ACTION_GROUPS = {
  team: [
    CrmAuditAction.INVITE_SENT,
    CrmAuditAction.INVITE_REVOKED,
    CrmAuditAction.INVITE_ACCEPTED,
    CrmAuditAction.MEMBER_ROLE_CHANGED,
    CrmAuditAction.MEMBER_STATUS_CHANGED,
  ],
  roles: [CrmAuditAction.ROLE_CREATED, CrmAuditAction.ROLE_UPDATED, CrmAuditAction.ROLE_DELETED],
  billing: [
    CrmAuditAction.SUBSCRIPTION_CHECKOUT_STARTED,
    CrmAuditAction.SUBSCRIPTION_ACTIVATED,
    CrmAuditAction.SUBSCRIPTION_CANCELED,
  ],
  organization: [
    CrmAuditAction.ORGANIZATION_RENAMED,
    CrmAuditAction.OWNERSHIP_TRANSFER_REQUESTED,
    CrmAuditAction.OWNERSHIP_TRANSFER_ACCEPTED,
    CrmAuditAction.OWNERSHIP_TRANSFER_DECLINED,
    CrmAuditAction.OWNERSHIP_TRANSFER_REVOKED,
  ],
} as const;

export type AuditActionGroup = keyof typeof AUDIT_ACTION_GROUPS;

export const AUDIT_TARGET_TYPE = {
  INVITE: "invite",
  MEMBERSHIP: "membership",
  ROLE: "role",
  ORGANIZATION: "organization",
  OWNERSHIP_TRANSFER: "ownership_transfer",
  SUBSCRIPTION: "subscription",
} as const;
