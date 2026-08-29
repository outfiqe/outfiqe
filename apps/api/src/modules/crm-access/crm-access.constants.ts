import type { PermissionRecord } from "./crm-access.types.js";

export const PERMISSION_CATALOG: PermissionRecord[] = [
  { key: "org:read", label: "View organization settings", group: "Organization" },
  { key: "org:update", label: "Update organization settings", group: "Organization" },
  {
    key: "org:transfer_ownership",
    label: "Transfer SUPERADMIN ownership",
    group: "Organization",
  },
  { key: "roles:read", label: "View roles", group: "Roles & members" },
  { key: "roles:manage", label: "Create and edit roles", group: "Roles & members" },
  { key: "members:read", label: "View members", group: "Roles & members" },
  { key: "members:invite", label: "Invite members", group: "Roles & members" },
  { key: "members:manage", label: "Manage member roles and access", group: "Roles & members" },
  { key: "billing:read", label: "View billing", group: "Billing" },
  { key: "billing:manage", label: "Manage billing", group: "Billing" },
  { key: "accounts:read", label: "View partners", group: "Partners, customers & contacts" },
  { key: "accounts:write", label: "Edit partners", group: "Partners, customers & contacts" },
  { key: "accounts:delete", label: "Delete partners", group: "Partners, customers & contacts" },
  { key: "customers:read", label: "View customers", group: "Partners, customers & contacts" },
  { key: "customers:write", label: "Edit customers", group: "Partners, customers & contacts" },
  { key: "contacts:read", label: "View contacts", group: "Partners, customers & contacts" },
  { key: "contacts:write", label: "Edit contacts", group: "Partners, customers & contacts" },
  { key: "contacts:delete", label: "Delete contacts", group: "Partners, customers & contacts" },
  { key: "pipeline:read", label: "View pipeline", group: "Pipeline & deals" },
  { key: "pipeline:configure", label: "Configure pipeline stages", group: "Pipeline & deals" },
  { key: "deals:read", label: "View deals", group: "Pipeline & deals" },
  { key: "deals:write", label: "Edit deals", group: "Pipeline & deals" },
  { key: "deals:delete", label: "Delete deals", group: "Pipeline & deals" },
  { key: "tickets:read", label: "View tickets", group: "Support" },
  { key: "tickets:write", label: "Edit tickets", group: "Support" },
  { key: "tickets:manage", label: "Manage ticket assignment", group: "Support" },
  { key: "activities:read", label: "View activities", group: "Activities, tasks & reports" },
  { key: "activities:write", label: "Log activities", group: "Activities, tasks & reports" },
  { key: "tasks:read", label: "View tasks", group: "Activities, tasks & reports" },
  { key: "tasks:write", label: "Edit tasks", group: "Activities, tasks & reports" },
  { key: "reports:read", label: "View reports", group: "Activities, tasks & reports" },
  {
    key: "platform:access",
    label: "Access Outfiqe's own commerce admin sections",
    group: "Platform",
  },
];

export const SUPERADMIN_ONLY_PERMISSION_KEYS = ["org:transfer_ownership"];

export const PLATFORM_ACCESS_PERMISSION_KEY = "platform:access";

export const SELECTABLE_ROLE_PERMISSION_KEYS = PERMISSION_CATALOG.map(
  (permission) => permission.key,
).filter(
  (key) => !SUPERADMIN_ONLY_PERMISSION_KEYS.includes(key) && key !== PLATFORM_ACCESS_PERMISSION_KEY,
);

const MEMBER_PERMISSION_KEYS = [
  "org:read",
  "billing:read",
  "accounts:read",
  "accounts:write",
  "customers:read",
  "customers:write",
  "contacts:read",
  "contacts:write",
  "pipeline:read",
  "deals:read",
  "deals:write",
  "tickets:read",
  "tickets:write",
  "activities:read",
  "activities:write",
  "tasks:read",
  "tasks:write",
  "reports:read",
];

export const BUILT_IN_ROLE_NAME = {
  ADMIN: "Admin",
  MEMBER: "Member",
} as const;

type BuiltInRoleName = (typeof BUILT_IN_ROLE_NAME)[keyof typeof BUILT_IN_ROLE_NAME];

export const BUILT_IN_ROLE_PERMISSIONS: Record<BuiltInRoleName, string[]> = {
  [BUILT_IN_ROLE_NAME.ADMIN]: SELECTABLE_ROLE_PERMISSION_KEYS,
  [BUILT_IN_ROLE_NAME.MEMBER]: MEMBER_PERMISSION_KEYS,
};

export const CUSTOM_ROLE_NAME_MIN_LENGTH = 2;
export const CUSTOM_ROLE_NAME_MAX_LENGTH = 50;
export const ORGANIZATION_NAME_MIN_LENGTH = 2;
export const ORGANIZATION_NAME_MAX_LENGTH = 100;

export const SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const RESERVED_SUBDOMAINS = [
  "www",
  "api",
  "admin",
  "app",
  "mail",
  "ftp",
  "staging",
  "localhost",
  "crm",
];

export const ORGANIZATION_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const OWNERSHIP_TRANSFER_REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const CRM_INVITE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const CRM_INVITE_RATE_LIMIT_MAX_REQUESTS = 20;

export const CRM_ORGANIZATION_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const CRM_ORGANIZATION_RATE_LIMIT_MAX_REQUESTS = 10;

export const CRM_OWNERSHIP_TRANSFER_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const CRM_OWNERSHIP_TRANSFER_RATE_LIMIT_MAX_REQUESTS = 10;

export const CRM_ROLE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const CRM_ROLE_RATE_LIMIT_MAX_REQUESTS = 40;
