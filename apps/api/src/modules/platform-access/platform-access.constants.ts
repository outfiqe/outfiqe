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
] as const;

export type PlatformPermissionKey = (typeof PLATFORM_PERMISSION_CATALOG)[number]["key"];

export const PLATFORM_PERMISSION_KEYS: readonly PlatformPermissionKey[] =
  PLATFORM_PERMISSION_CATALOG.map((permission) => permission.key);

export const isPlatformPermissionKey = (key: string): key is PlatformPermissionKey =>
  PLATFORM_PERMISSION_KEYS.includes(key as PlatformPermissionKey);
