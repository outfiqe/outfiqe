export const PLATFORM_PERMISSION_CATALOG = [
  {
    key: "platform:metrics:read",
    label: "View cross-tenant metrics",
    group: "Platform",
  },
  {
    key: "platform:features:manage",
    label: "Toggle tenant feature flags",
    group: "Platform",
  },
  {
    key: "platform:impersonate",
    label: "Start an impersonation session",
    group: "Platform",
  },
  {
    key: "platform:impersonate:manage",
    label: "Revoke any impersonation session",
    group: "Platform",
  },
  {
    key: "platform:audit:read",
    label: "Read the platform audit log",
    group: "Platform",
  },
  {
    key: "platform:team:manage",
    label: "Invite and manage platform staff",
    group: "Platform",
  },
  {
    key: "platform:suspensions:manage",
    label: "Suspend, ban, or restore accounts and brands",
    group: "Platform",
  },
  {
    key: "platform:support:read",
    label: "Read support requests",
    group: "Support",
  },
  {
    key: "platform:support:respond",
    label: "Reply to and move support requests",
    group: "Support",
  },
  {
    key: "platform:support:manage",
    label: "Assign and configure support",
    group: "Support",
  },
  {
    key: "platform:withdraw:manage",
    label: "Approve, reject, and pay out withdrawal requests",
    group: "Finance",
  },
  {
    key: "platform:coupons:manage",
    label: "Create and manage platform coupons",
    group: "Finance",
  },
  {
    key: "platform:organizations:manage",
    label: "Create new tenant organizations",
    group: "Platform",
  },
  {
    key: "platform:xp:manage",
    label: "Manually adjust a user's XP",
    group: "Gamification",
  },
] as const;

export type PlatformPermissionKey = (typeof PLATFORM_PERMISSION_CATALOG)[number]["key"];

export const PLATFORM_PERMISSION_KEYS: readonly PlatformPermissionKey[] =
  PLATFORM_PERMISSION_CATALOG.map((permission) => permission.key);

export const isPlatformPermissionKey = (key: string): key is PlatformPermissionKey =>
  PLATFORM_PERMISSION_KEYS.includes(key as PlatformPermissionKey);
