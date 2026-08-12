"use client";

import { GalleryVerticalEnd, LogOut, Package, Store, User } from "lucide-react";
import {
  Sidebar,
  sidebarWidthClass,
  useSidebarCollapse,
  type SidebarNavItem,
  type SidebarNavSection,
} from "@outfiqe/components";

import { cn } from "@/shared/lib/cn";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus, UserRole } from "@/features/auth/types";
import { useNextSidebarNavigation } from "./useNextSidebarNavigation";

const CREATOR_NAV: SidebarNavItem[] = [
  { id: "profile", href: "/dashboard/profile", label: "Profile", icon: User },
  { id: "posts", href: "/dashboard/posts", label: "Posts", icon: GalleryVerticalEnd },
];

const BRAND_NAV: SidebarNavItem[] = [
  { id: "profile", href: "/dashboard/profile", label: "Profile", icon: Store },
  { id: "products", href: "/dashboard/products", label: "Products", icon: Package },
];

export function DashboardSidebar() {
  const { state } = useAuth();
  const logout = useLogout();
  const navigation = useNextSidebarNavigation();
  const { collapsed, toggle } = useSidebarCollapse("outfiqe:web-sidebar-collapsed");

  if (state.status === AuthStatus.IDLE || state.status === AuthStatus.LOADING) {
    return <aside className={cn("shrink-0", sidebarWidthClass(collapsed))} aria-hidden />;
  }

  const user = state.user;
  if (!user) return null;

  const isBrand = user.role === UserRole.BRAND_OWNER;
  const navItems = isBrand ? BRAND_NAV : CREATOR_NAV;
  const sections: SidebarNavSection[] = [{ id: isBrand ? "brand" : "creator", items: navItems }];

  const header = (
    <div className={cn("flex min-w-0 items-center gap-2.5", collapsed && "justify-center")}>
      <div className="size-9 shrink-0 overflow-hidden rounded-full">
        <div
          className="flex size-full items-center justify-center bg-cover bg-center"
          style={user.avatarUrl ? { backgroundImage: `url(${user.avatarUrl})` } : undefined}
        >
          {!user.avatarUrl && (
            <span
              aria-hidden
              className="flex size-full items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: getAvatarColor(user.id) }}
            >
              {initialsFor(user.name)}
            </span>
          )}
        </div>
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground" title={user.name}>
            {user.name}
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
        "flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-60",
        collapsed ? "justify-center px-0" : "pl-3.5 pr-3",
      )}
    >
      <LogOut className="size-4 shrink-0" />
      {!collapsed && (logout.isPending ? "Signing out…" : "Sign out")}
    </button>
  );

  return (
    <aside className={cn("shrink-0", sidebarWidthClass(collapsed))}>
      <div className="sticky top-24">
        <Sidebar
          sections={sections}
          navigation={navigation}
          ariaLabel="Dashboard"
          collapsed={collapsed}
          onToggleCollapse={toggle}
          header={header}
          footer={footer}
        />
      </div>
    </aside>
  );
}
