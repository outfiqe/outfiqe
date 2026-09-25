export const PLATFORM_NAV_KEYS = [
  "brand-applications",
  "platform-metrics",
  "platform-features",
  "platform-impersonation",
  "platform-nav-access",
  "users",
  "products",
  "collections",
  "categories",
  "product-types",
  "size-options",
  "hero-slides",
  "orders",
  "support",
  "product-reviews",
  "tag-reviews",
  "tag-reports",
  "content-reports",
  "content-browser",
  "trending",
  "creators",
  "commissions",
  "platform-commission",
  "withdraw-requests",
  "withdraw-policy",
  "bank-accounts",
  "financial-rollup",
  "coupons",
  "gamification",
  "delivery-zones",
  "organizations",
  "team",
  "announcements",
] as const;

export type PlatformNavKey = (typeof PLATFORM_NAV_KEYS)[number];

export const SERVER_ENFORCED_PLATFORM_NAV_KEYS = [
  "gamification",
  "commissions",
  "platform-commission",
  "withdraw-requests",
  "withdraw-policy",
  "bank-accounts",
  "financial-rollup",
  "coupons",
  "platform-impersonation",
  "platform-features",
  "team",
  "organizations",
  "announcements",
] as const satisfies readonly PlatformNavKey[];

export type ServerEnforcedPlatformNavKey = (typeof SERVER_ENFORCED_PLATFORM_NAV_KEYS)[number];

export const isPlatformNavKey = (key: string): key is PlatformNavKey =>
  (PLATFORM_NAV_KEYS as readonly string[]).includes(key);

export const MAX_PLATFORM_CO_FOUNDERS = 4;
