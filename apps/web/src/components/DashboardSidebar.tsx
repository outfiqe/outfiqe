"use client";

import { GalleryVerticalEnd, LogOut, Package, Store, User } from "lucide-react";
import {
  Sidebar,
  sidebarWidthClass,
  useSidebarCollapse,
  type SidebarNavItem,
  type SidebarNavSection,
} from "@outfiqe/shared-components";

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

  return (
    <aside className={cn("shrink-0", sidebarWidthClass(collapsed))}>
      <div className="sticky top-24 space-y-4">
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-border bg-card p-3",
            collapsed && "justify-center",
          )}
        >
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: getAvatarColor(user.id) }}
          >
            {initialsFor(user.name)}
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {isBrand ? "Brand account" : "Creator account"}
              </p>
            </div>
          )}
        </div>

        <Sidebar
          sections={sections}
          navigation={navigation}
          ariaLabel="Dashboard"
          collapsed={collapsed}
          onToggleCollapse={toggle}
        />

        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-full px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60",
            collapsed && "justify-center px-0",
          )}
        >
          <LogOut className="size-4 shrink-0" />
          {!collapsed && (logout.isPending ? "Signing out…" : "Sign out")}
        </button>
      </div>
    </aside>
  );
}
