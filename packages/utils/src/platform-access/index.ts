import type { PlatformNavKey } from "../platform-nav";

export type PlatformSectionAccess = {
  permissionKeys: readonly string[];
  requiresCoFounder: boolean;
};

const anyOf = (...permissionKeys: string[]): PlatformSectionAccess => ({
  permissionKeys,
  requiresCoFounder: false,
});

const CO_FOUNDER_ONLY: PlatformSectionAccess = { permissionKeys: [], requiresCoFounder: true };

const CATALOG_ACCESS = anyOf("platform:catalog:read", "platform:catalog:manage");
const ORDERS_ACCESS = anyOf("platform:orders:read", "platform:orders:manage");
const CREATORS_ACCESS = anyOf("platform:creators:read", "platform:creators:manage");
const COMMISSIONS_ACCESS = anyOf("platform:commissions:read", "platform:commissions:manage");
const WITHDRAW_ACCESS = anyOf("platform:withdraw:read", "platform:withdraw:manage");
const REVIEW_MODERATION_ACCESS = anyOf("platform:reviews:moderate");
const CONTENT_MODERATION_ACCESS = anyOf("platform:content:moderate");

export const PLATFORM_SECTION_ACCESS: Record<PlatformNavKey, PlatformSectionAccess> = {
  "brand-applications": anyOf("platform:brands:read", "platform:brands:manage"),
  "platform-metrics": anyOf("platform:metrics:read"),
  "platform-features": anyOf("platform:features:manage"),
  "platform-impersonation": anyOf("platform:impersonate", "platform:impersonate:manage"),
  "platform-nav-access": CO_FOUNDER_ONLY,
  users: anyOf("platform:users:read", "platform:users:manage"),
  products: CATALOG_ACCESS,
  collections: CATALOG_ACCESS,
  categories: CATALOG_ACCESS,
  "product-types": CATALOG_ACCESS,
  "size-options": CATALOG_ACCESS,
  "hero-slides": CATALOG_ACCESS,
  trending: CATALOG_ACCESS,
  orders: ORDERS_ACCESS,
  "delivery-zones": ORDERS_ACCESS,
  support: anyOf("platform:support:read", "platform:support:respond", "platform:support:manage"),
  "product-reviews": REVIEW_MODERATION_ACCESS,
  "tag-reviews": REVIEW_MODERATION_ACCESS,
  "tag-reports": REVIEW_MODERATION_ACCESS,
  "content-reports": CONTENT_MODERATION_ACCESS,
  "content-browser": CONTENT_MODERATION_ACCESS,
  creators: CREATORS_ACCESS,
  commissions: COMMISSIONS_ACCESS,
  "platform-commission": COMMISSIONS_ACCESS,
  "withdraw-requests": WITHDRAW_ACCESS,
  "withdraw-policy": WITHDRAW_ACCESS,
  "bank-accounts": WITHDRAW_ACCESS,
  "financial-rollup": anyOf("platform:finance:read"),
  coupons: anyOf("platform:coupons:read", "platform:coupons:manage"),
  gamification: anyOf(
    "platform:gamification:read",
    "platform:gamification:manage",
    "platform:xp:manage",
  ),
  organizations: anyOf("platform:organizations:read", "platform:organizations:manage"),
  team: anyOf("platform:team:manage"),
  announcements: anyOf("platform:announcements:read", "platform:announcements:manage"),
};

export const PLATFORM_SECTION_KEYS = Object.keys(PLATFORM_SECTION_ACCESS) as PlatformNavKey[];

export const canAccessPlatformSection = (
  sectionKey: PlatformNavKey,
  viewer: { isCoFounder: boolean; permissionKeys: readonly string[] },
): boolean => {
  if (viewer.isCoFounder) return true;

  const { permissionKeys, requiresCoFounder } = PLATFORM_SECTION_ACCESS[sectionKey];
  if (requiresCoFounder) return false;

  return permissionKeys.some((permissionKey) => viewer.permissionKeys.includes(permissionKey));
};

export const findInaccessiblePlatformSections = (viewer: {
  isCoFounder: boolean;
  permissionKeys: readonly string[];
}): PlatformNavKey[] =>
  PLATFORM_SECTION_KEYS.filter((sectionKey) => !canAccessPlatformSection(sectionKey, viewer));
