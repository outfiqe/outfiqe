"use client";

import type { SidebarNavItem } from "@outfiqe/components";
import {
  Award,
  BanknoteArrowUp,
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

const SIZES_NAV_ITEM: SidebarNavItem = {
  id: "sizes",
  href: "/settings/sizes",
  label: "My sizes",
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
  SIZES_NAV_ITEM,
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
  { id: "wallet", href: "/wallet", label: "Wallet", icon: Wallet },
  CHAT_SETTINGS_NAV_ITEM,
  SECURITY_NAV_ITEM,
  SUPPORT_NAV_ITEM,
];

const CRM_NAV_ITEM: SidebarNavItem = {
  id: "crm",
  href: "/admin/crm",
  label: "CRM",
  icon: LayoutGrid,
};

type DashboardNav = {
  navItems: SidebarNavItem[];
  isBrand: boolean;
  accountLabel: string;
};

export const useDashboardNav = (): DashboardNav => {
  const { state, hasCrmAccess, isCreator } = useAuth();
  const isOnTenantHost = useTenantHost();
  const isOutfitBuildOn = useFeatureFlag("outfit_builder");
  const { canEarn } = useCommissionEligibility();

  const isBrand = state.user?.role === UserRole.BRAND_OWNER;
  const roleNavItems = isBrand ? BRAND_NAV : navItemsForShopper(isCreator, canEarn);
  const canUseOffers = isBrand || isCreator;
  const outfitBuildNavItems = canUseOffers ? [BUILDS_NAV_ITEM, OFFERS_NAV_ITEM] : [BUILDS_NAV_ITEM];
  const baseNavItems = isOutfitBuildOn
    ? roleNavItems.flatMap((item) =>
        item === OVERVIEW_NAV_ITEM ? [item, ...outfitBuildNavItems] : [item],
      )
    : roleNavItems;
  const showCrmLink = hasCrmAccess && isOnTenantHost;
  const navItems = showCrmLink ? [...baseNavItems, CRM_NAV_ITEM] : baseNavItems;

  const accountLabel = isBrand ? "Brand account" : isCreator ? "Muse account" : "Shopper account";

  return { navItems, isBrand, accountLabel };
};
