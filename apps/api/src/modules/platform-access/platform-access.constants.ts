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
  {
    key: "platform:gamification:manage",
    label: "Manage badges, challenges, and creator competitions",
    group: "Gamification",
  },
  {
    key: "platform:commissions:manage",
    label: "Manage commission tiers, payouts, and platform fees",
    group: "Finance",
  },
  {
    key: "platform:announcements:manage",
    label: "Compose and send broadcast announcements",
    group: "Platform",
  },
  {
    key: "platform:content:moderate",
    label: "Remove reported creator-look posts and comments",
    group: "Moderation",
  },
  {
    key: "platform:catalog:read",
    label: "View products, collections, categories, sizes, banners and trending",
    group: "Catalog",
  },
  {
    key: "platform:catalog:manage",
    label: "Edit the catalog and approve or reject submitted products",
    group: "Catalog",
  },
  {
    key: "platform:orders:read",
    label: "View orders and delivery zones",
    group: "Orders",
  },
  {
    key: "platform:orders:manage",
    label: "Update fulfilment, cancel orders and edit delivery zones",
    group: "Orders",
  },
  {
    key: "platform:users:read",
    label: "View user accounts",
    group: "Users",
  },
  {
    key: "platform:users:manage",
    label: "Create user accounts",
    group: "Users",
  },
  {
    key: "platform:creators:read",
    label: "View creators and creator applications",
    group: "Creators",
  },
  {
    key: "platform:creators:manage",
    label: "Approve or reject creator applications",
    group: "Creators",
  },
  {
    key: "platform:brands:read",
    label: "View brand applications",
    group: "Brands",
  },
  {
    key: "platform:brands:manage",
    label: "Approve or reject brand applications",
    group: "Brands",
  },
  {
    key: "platform:reviews:moderate",
    label: "Moderate product reviews and product tag reviews and reports",
    group: "Moderation",
  },
  {
    key: "platform:finance:read",
    label: "View the financial rollup and ledger",
    group: "Finance",
  },
  {
    key: "platform:withdraw:read",
    label: "View withdrawal requests and the withdrawal policy",
    group: "Finance",
  },
  {
    key: "platform:coupons:read",
    label: "View coupons and their redemptions",
    group: "Finance",
  },
  {
    key: "platform:commissions:read",
    label: "View commission tiers, payouts and platform fees",
    group: "Finance",
  },
  {
    key: "platform:gamification:read",
    label: "View badges, challenges, XP levels and competitions",
    group: "Gamification",
  },
  {
    key: "platform:organizations:read",
    label: "View tenant organizations",
    group: "Platform",
  },
  {
    key: "platform:announcements:read",
    label: "View broadcast announcements",
    group: "Platform",
  },
] as const;

export type PlatformPermissionKey = (typeof PLATFORM_PERMISSION_CATALOG)[number]["key"];

export const CONTENT_MODERATE_PERMISSION_KEY: PlatformPermissionKey = "platform:content:moderate";

export const REVIEW_MODERATE_PERMISSION_KEY: PlatformPermissionKey = "platform:reviews:moderate";

export const BRAND_REVIEW_PERMISSION_KEYS: readonly PlatformPermissionKey[] = [
  "platform:brands:manage",
];

export const SUPPORT_AGENT_PERMISSION_KEYS: readonly PlatformPermissionKey[] = [
  "platform:support:respond",
  "platform:support:manage",
];

export const COUPON_MANAGEMENT_PERMISSION_KEYS: readonly PlatformPermissionKey[] = [
  "platform:coupons:manage",
];

export const PLATFORM_PERMISSION_KEYS: readonly PlatformPermissionKey[] =
  PLATFORM_PERMISSION_CATALOG.map((permission) => permission.key);

export const isPlatformPermissionKey = (key: string): key is PlatformPermissionKey =>
  PLATFORM_PERMISSION_KEYS.includes(key as PlatformPermissionKey);
