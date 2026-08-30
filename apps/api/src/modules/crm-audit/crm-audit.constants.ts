export const AUDIT_READ_PERMISSION_KEY = "audit:read";

export const DEFAULT_AUDIT_PAGE_SIZE = 25;
export const MAX_AUDIT_PAGE_SIZE = 100;

export const AUDIT_TARGET_TYPE = {
  INVITE: "invite",
  MEMBERSHIP: "membership",
  ROLE: "role",
  ORGANIZATION: "organization",
  OWNERSHIP_TRANSFER: "ownership_transfer",
  SUBSCRIPTION: "subscription",
} as const;
