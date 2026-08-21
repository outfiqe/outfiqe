"use client";

import {
  Sidebar,
  type SidebarNavItem,
  type SidebarNavSection,
  sidebarWidthClass,
  useSidebarCollapse,
} from "@outfiqe/components";
import {
  Award,
  LogOut,
  Package,
  Share2,
  ShoppingBag,
  Sparkles,
  Store,
  Trophy,
  User,
  Wallet,
} from "lucide-react";

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus, UserRole } from "@/features/auth/types";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";

import { useNextSidebarNavigation } from "./useNextSidebarNavigation";

const CREATOR_NAV: SidebarNavItem[] = [
  { id: "profile", href: "/dashboard/profile", label: "Profile", icon: User },
  { id: "share", href: "/dashboard/share", label: "Share", icon: Share2 },
  { id: "earnings", href: "/dashboard/earnings", label: "Earnings", icon: Wallet },
  { id: "progress", href: "/dashboard/progress", label: "Progress", icon: Sparkles },
  { id: "badges", href: "/dashboard/badges", label: "Badges", icon: Award },
  { id: "challenges", href: "/dashboard/challenges", label: "Challenges", icon: Trophy },
];

const BRAND_NAV: SidebarNavItem[] = [
  { id: "profile", href: "/dashboard/profile", label: "Profile", icon: Store },
  { id: "products", href: "/dashboard/products", label: "Products", icon: Package },
  { id: "orders", href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
];

export const DashboardSidebar = () => {
  const { state } = useAuth();
  const logout = useLogout();
  const navigation = useNextSidebarNavigation();
  const { collapsed, toggle } = useSidebarCollapse("outfiqe:web-sidebar-collapsed");

  if (state.status === AuthStatus.IDLE || state.status === AuthStatus.LOADING) {
    return <aside className={cn("shrink-0", sidebarWidthClass(collapsed))} aria-hidden />;
  }

  const user = state.user;
  if (!user) return null;

  const { role, avatarUrl, id, name } = user;

  const isBrand = role === UserRole.BRAND_OWNER;
  const navItems = isBrand ? BRAND_NAV : CREATOR_NAV;
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
            {isBrand ? "Brand account" : "Creator account"}
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
      <Sidebar
        sections={sections}
        navigation={navigation}
        ariaLabel="Dashboard"
        collapsed={collapsed}
        onToggleCollapse={toggle}
        header={header}
        footer={footer}
      />
    </aside>
  );
};
