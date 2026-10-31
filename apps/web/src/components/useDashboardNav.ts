"use client";

import type { SidebarNavItem } from "@outfiqe/components";
import { isStaffUserRole } from "@outfiqe/utils";
import {
  Award,
  BanknoteArrowUp,
  Bike,
  HandCoins,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  MapPin,
  MessageCircleOff,
  Package,
  Ruler,
  Share2,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
  Tags,
  Trophy,
  User,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/features/auth";
import { UserRole } from "@/features/auth/types";
import { useCommissionEligibility } from "@/features/creator-dashboard/earnings/hooks/useCommissionEligibility";
import { useFeatureFlag } from "@/shared/hooks/useFeatureFlag";
import { useTenantHost } from "@/shared/hooks/useTenantHost";

const SECURITY_NAV_ITEM: SidebarNavItem = {
  id: "security",
  href: "/settings/security",
  label: "Security",
  icon: ShieldCheck,
};

const CHAT_SETTINGS_NAV_ITEM: SidebarNavItem = {
  id: "chat-settings",
  href: "/settings/chat",
  label: "Chat",
  icon: MessageCircleOff,
};

const MEASUREMENTS_NAV_ITEM: SidebarNavItem = {
  id: "measurements",
  href: "/settings/measurements",
  label: "My measurements",
  icon: Ruler,
};

const BUILDS_NAV_ITEM: SidebarNavItem = {
  id: "builds",
  href: "/builds",
  label: "My Builds",
  icon: Shirt,
};

const OFFERS_NAV_ITEM: SidebarNavItem = {
  id: "offers",
  href: "/offers",
  label: "Offers",
  icon: HandCoins,
};

const ADDRESSES_NAV_ITEM: SidebarNavItem = {
  id: "addresses",
  href: "/settings/addresses",
  label: "Addresses",
  icon: MapPin,
};

const OVERVIEW_NAV_ITEM: SidebarNavItem = {
  id: "overview",
  href: "/overview",
  label: "Overview",
  icon: LayoutDashboard,
};

const SUPPORT_NAV_ITEM: SidebarNavItem = {
  id: "support",
  href: "/support",
  label: "Support",
  icon: LifeBuoy,
};

const CREATOR_NAV: SidebarNavItem[] = [
  OVERVIEW_NAV_ITEM,
  { id: "profile", href: "/profile", label: "Profile", icon: User },
  { id: "share", href: "/share", label: "Share", icon: Share2 },
  { id: "earnings", href: "/earnings", label: "Earnings", icon: Wallet },
  { id: "withdraw", href: "/withdraw", label: "Withdraw", icon: BanknoteArrowUp },
  { id: "progress", href: "/progress", label: "Progress", icon: Sparkles },
  { id: "badges", href: "/badges", label: "Badges", icon: Award },
  { id: "challenges", href: "/challenges", label: "Challenges", icon: Trophy },
  ADDRESSES_NAV_ITEM,
  MEASUREMENTS_NAV_ITEM,
  CHAT_SETTINGS_NAV_ITEM,
  SECURITY_NAV_ITEM,
  SUPPORT_NAV_ITEM,
];

const APPROVED_CREATOR_ONLY_NAV_IDS = new Set(["share", "earnings", "withdraw"]);
const EARNER_NAV_IDS = new Set(["earnings", "withdraw"]);

const navItemsForShopper = (isCreator: boolean, canEarn: boolean): SidebarNavItem[] => {
  if (isCreator) return CREATOR_NAV;
  return CREATOR_NAV.filter(
    ({ id }) => !APPROVED_CREATOR_ONLY_NAV_IDS.has(id) || (canEarn && EARNER_NAV_IDS.has(id)),
  );
};

const BRAND_NAV: SidebarNavItem[] = [
  OVERVIEW_NAV_ITEM,
  { id: "profile", href: "/profile", label: "Profile", icon: Store },
  { id: "products", href: "/products", label: "Products", icon: Package },
  { id: "tag-reviews", href: "/tag-reviews", label: "Tag reviews", icon: Tags },
  { id: "orders", href: "/manage-orders", label: "Orders", icon: ShoppingBag },
  { id: "pickup-locations", href: "/pickup-locations", label: "Pickup locations", icon: MapPin },
  { id: "wallet", href: "/wallet", label: "Wallet", icon: Wallet },
  CHAT_SETTINGS_NAV_ITEM,
  SECURITY_NAV_ITEM,
  SUPPORT_NAV_ITEM,
];

const ORDER_LOGISTICS_ONLY_NAV_IDS = new Set(["pickup-locations"]);

const brandNavItems = (isOrderLogisticsOn: boolean): SidebarNavItem[] =>
  isOrderLogisticsOn
    ? BRAND_NAV
    : BRAND_NAV.filter(({ id }) => !ORDER_LOGISTICS_ONLY_NAV_IDS.has(id));

const RIDER_NAV: SidebarNavItem[] = [
  { id: "rider-visits", href: "/rider", label: "Visits", icon: Bike },
  { id: "rider-earnings", href: "/rider/earnings", label: "Earnings", icon: Wallet },
  SECURITY_NAV_ITEM,
  SUPPORT_NAV_ITEM,
];

const ADMIN_PANEL_NAV_ITEM: SidebarNavItem = {
  id: "admin-panel",
  href: "/admin",
  label: "Admin panel",
  icon: LayoutDashboard,
};

const STAFF_NAV: SidebarNavItem[] = [
  ADMIN_PANEL_NAV_ITEM,
  CHAT_SETTINGS_NAV_ITEM,
  SECURITY_NAV_ITEM,
];

const NAV_ITEMS_BUILDS_FOLLOW: ReadonlySet<SidebarNavItem> = new Set([
  OVERVIEW_NAV_ITEM,
  ADMIN_PANEL_NAV_ITEM,
]);

const CRM_NAV_ITEM: SidebarNavItem = {
  id: "crm",
  href: "/admin/crm",
  label: "CRM",
  icon: LayoutGrid,
};

type DashboardNav = {
  navItems: SidebarNavItem[];
  navSectionId: string;
  accountLabel: string;
};

const ACCOUNT_KIND = {
  BRAND: "brand",
  RIDER: "rider",
  STAFF: "staff",
  MUSE: "muse",
  SHOPPER: "shopper",
} as const;

type AccountKind = (typeof ACCOUNT_KIND)[keyof typeof ACCOUNT_KIND];

const ACCOUNT_LABELS: Record<AccountKind, string> = {
  [ACCOUNT_KIND.BRAND]: "Brand account",
  [ACCOUNT_KIND.RIDER]: "Rider account",
  [ACCOUNT_KIND.STAFF]: "Staff account",
  [ACCOUNT_KIND.MUSE]: "Muse account",
  [ACCOUNT_KIND.SHOPPER]: "Shopper account",
};

const NAV_SECTION_IDS: Record<AccountKind, string> = {
  [ACCOUNT_KIND.BRAND]: "brand",
  [ACCOUNT_KIND.RIDER]: "rider",
  [ACCOUNT_KIND.STAFF]: "staff",
  [ACCOUNT_KIND.MUSE]: "creator",
  [ACCOUNT_KIND.SHOPPER]: "creator",
};

type NavChoices = { isOrderLogisticsOn: boolean; isCreator: boolean; canEarn: boolean };

const describeAccountKind = (
  role: UserRole | undefined,
  isCreator: boolean,
  hasBrand: boolean,
): AccountKind => {
  if (role === UserRole.BRAND_OWNER) return ACCOUNT_KIND.BRAND;
  if (role === UserRole.RIDER) return ACCOUNT_KIND.RIDER;
  if (isCreator) return ACCOUNT_KIND.MUSE;
  return isStaffUserRole(role) && !hasBrand ? ACCOUNT_KIND.STAFF : ACCOUNT_KIND.SHOPPER;
};

const navItemsForAccount = (
  accountKind: AccountKind,
  { isOrderLogisticsOn, isCreator, canEarn }: NavChoices,
): SidebarNavItem[] => {
  if (accountKind === ACCOUNT_KIND.BRAND) return brandNavItems(isOrderLogisticsOn);
  if (accountKind === ACCOUNT_KIND.RIDER) return RIDER_NAV;
  if (accountKind === ACCOUNT_KIND.STAFF) return STAFF_NAV;
  return navItemsForShopper(isCreator, canEarn);
};

export const useDashboardNav = (): DashboardNav => {
  const { state, hasCrmAccess, isCreator } = useAuth();
  const isOnTenantHost = useTenantHost();
  const isOutfitBuildOn = useFeatureFlag("outfit_builder");
  const isOrderLogisticsOn = useFeatureFlag("order_logistics");
  const { canEarn } = useCommissionEligibility();

  const hasBrand = state.user?.brandId !== undefined;
  const accountKind = describeAccountKind(state.user?.role, isCreator, hasBrand);
  const roleNavItems = navItemsForAccount(accountKind, { isOrderLogisticsOn, isCreator, canEarn });
  const canUseOffers = accountKind === ACCOUNT_KIND.BRAND || isCreator;
  const outfitBuildNavItems = canUseOffers ? [BUILDS_NAV_ITEM, OFFERS_NAV_ITEM] : [BUILDS_NAV_ITEM];
  const baseNavItems = isOutfitBuildOn
    ? roleNavItems.flatMap((navItem) =>
        NAV_ITEMS_BUILDS_FOLLOW.has(navItem) ? [navItem, ...outfitBuildNavItems] : [navItem],
      )
    : roleNavItems;
  const showCrmLink = hasCrmAccess && isOnTenantHost;
  const navItems = showCrmLink ? [...baseNavItems, CRM_NAV_ITEM] : baseNavItems;

  return {
    navItems,
    navSectionId: NAV_SECTION_IDS[accountKind],
    accountLabel: ACCOUNT_LABELS[accountKind],
  };
};
