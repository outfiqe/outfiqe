"use client";

import type { SidebarNavItem } from "@outfiqe/components";
import {
  Award,
  BanknoteArrowUp,
  LayoutGrid,
  MessageCircleOff,
  Package,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Trophy,
  User,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/features/auth";
import { UserRole } from "@/features/auth/types";
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

const CREATOR_NAV: SidebarNavItem[] = [
  { id: "profile", href: "/profile", label: "Profile", icon: User },
  { id: "share", href: "/share", label: "Share", icon: Share2 },
  { id: "earnings", href: "/earnings", label: "Earnings", icon: Wallet },
  { id: "withdraw", href: "/withdraw", label: "Withdraw", icon: BanknoteArrowUp },
  { id: "progress", href: "/progress", label: "Progress", icon: Sparkles },
  { id: "badges", href: "/badges", label: "Badges", icon: Award },
  { id: "challenges", href: "/challenges", label: "Challenges", icon: Trophy },
  CHAT_SETTINGS_NAV_ITEM,
  SECURITY_NAV_ITEM,
];

const APPROVED_CREATOR_ONLY_NAV_IDS = new Set(["share", "earnings", "withdraw"]);

const BRAND_NAV: SidebarNavItem[] = [
  { id: "profile", href: "/profile", label: "Profile", icon: Store },
  { id: "products", href: "/products", label: "Products", icon: Package },
  { id: "orders", href: "/manage-orders", label: "Orders", icon: ShoppingBag },
  { id: "wallet", href: "/wallet", label: "Wallet", icon: Wallet },
  CHAT_SETTINGS_NAV_ITEM,
  SECURITY_NAV_ITEM,
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

  const isBrand = state.user?.role === UserRole.BRAND_OWNER;
  const creatorNavItems = isCreator
    ? CREATOR_NAV
    : CREATOR_NAV.filter((item) => !APPROVED_CREATOR_ONLY_NAV_IDS.has(item.id));
  const baseNavItems = isBrand ? BRAND_NAV : creatorNavItems;
  const showCrmLink = hasCrmAccess && isOnTenantHost;
  const navItems = showCrmLink ? [...baseNavItems, CRM_NAV_ITEM] : baseNavItems;

  const accountLabel = isBrand
    ? "Brand account"
    : isCreator
      ? "Creator account"
      : "Shopper account";

  return { navItems, isBrand, accountLabel };
};
