export const PLATFORM_NAV_KEYS = [
  "brand-applications",
  "platform-metrics",
  "platform-features",
  "platform-impersonation",
  "platform-nav-access",
  "products",
  "collections",
  "categories",
  "product-types",
  "size-options",
  "hero-slides",
  "orders",
  "support",
  "product-reviews",
  "trending",
  "creators",
  "commissions",
  "platform-commission",
  "withdraw-requests",
  "withdraw-policy",
  "financial-rollup",
  "gamification",
  "delivery-zones",
  "organizations",
  "team",
] as const;

export type PlatformNavKey = (typeof PLATFORM_NAV_KEYS)[number];

export const SERVER_ENFORCED_PLATFORM_NAV_KEYS = [
  "gamification",
  "commissions",
  "platform-commission",
  "withdraw-requests",
  "withdraw-policy",
  "financial-rollup",
  "platform-impersonation",
  "platform-features",
  "team",
  "organizations",
] as const satisfies readonly PlatformNavKey[];

export type ServerEnforcedPlatformNavKey = (typeof SERVER_ENFORCED_PLATFORM_NAV_KEYS)[number];

export const isPlatformNavKey = (key: string): key is PlatformNavKey =>
  (PLATFORM_NAV_KEYS as readonly string[]).includes(key);

export const MAX_PLATFORM_CO_FOUNDERS = 4;
