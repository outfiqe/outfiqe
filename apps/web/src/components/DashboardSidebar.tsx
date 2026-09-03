"use client";

import {
  Sidebar,
  type SidebarNavItem,
  type SidebarNavSection,
  SidebarSkeleton,
  sidebarWidthClass,
  useSidebarCollapse,
} from "@outfiqe/components";
import {
  Award,
  BanknoteArrowUp,
  LayoutGrid,
  LogOut,
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

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus, UserRole } from "@/features/auth/types";
import { useTenantHost } from "@/shared/hooks/useTenantHost";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";

import { SidebarPendingNavProvider } from "./SidebarPendingNavContext";
import { useNextSidebarNavigation } from "./useNextSidebarNavigation";

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

export const DashboardSidebar = () => {
  const { state, hasCrmAccess, isCreator } = useAuth();
  const logout = useLogout();
  const navigation = useNextSidebarNavigation();
  const isOnTenantHost = useTenantHost();
  const { collapsed, toggle } = useSidebarCollapse("outfiqe:web-sidebar-collapsed");

  if (state.status === AuthStatus.IDLE || state.status === AuthStatus.LOADING) {
    return (
      <aside className={cn("shrink-0", sidebarWidthClass(collapsed))}>
        <SidebarSkeleton ariaLabel="Dashboard" collapsed={collapsed} rowCount={7} hasFooter />
      </aside>
    );
  }

  const user = state.user;
  if (!user) return null;

  const { role, avatarUrl, id, name } = user;

  const isBrand = role === UserRole.BRAND_OWNER;
  const creatorNavItems = isCreator
    ? CREATOR_NAV
    : CREATOR_NAV.filter((item) => !APPROVED_CREATOR_ONLY_NAV_IDS.has(item.id));
  const baseNavItems = isBrand ? BRAND_NAV : creatorNavItems;
  const showCrmLink = hasCrmAccess && isOnTenantHost;
  const navItems = showCrmLink ? [...baseNavItems, CRM_NAV_ITEM] : baseNavItems;
  const sections: SidebarNavSection[] = [{ id: isBrand ? "brand" : "creator", items: navItems }];

  const header = (
    <div className={cn("flex min-w-0 items-center gap-2.5", collapsed && "justify-center")}>
      <div className="size-9 shrink-0 overflow-hidden rounded-full">
        <div
          className="flex size-full items-center justify-center bg-cover bg-center"
          style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
        >
          {!avatarUrl && (
            <span
              aria-hidden
              className="flex size-full items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: getAvatarColor(id) }}
            >
              {initialsFor(name)}
            </span>
          )}
        </div>
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground" title={name}>
            {name}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {isBrand ? "Brand account" : isCreator ? "Creator account" : "Shopper account"}
          </p>
        </div>
      )}
    </div>
  );

  const footer = (
    <button
      type="button"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
      title={collapsed ? "Sign out" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-border bg-card text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-60",
        collapsed ? "size-11 justify-center" : "w-full px-3.5 py-2.5",
      )}
    >
      <LogOut className="size-[18px] shrink-0" />
      {!collapsed && (logout.isPending ? "Signing out…" : "Sign out")}
    </button>
  );

  return (
    <aside className={cn("shrink-0", sidebarWidthClass(collapsed))}>
      <SidebarPendingNavProvider>
        <Sidebar
          sections={sections}
          navigation={navigation}
          ariaLabel="Dashboard"
          collapsed={collapsed}
          onToggleCollapse={toggle}
          header={header}
          footer={footer}
        />
      </SidebarPendingNavProvider>
    </aside>
  );
};
