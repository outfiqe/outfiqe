"use client";

import {
  Sidebar,
  type SidebarNavSection,
  SidebarSkeleton,
  sidebarWidthClass,
  useSidebarCollapse,
} from "@outfiqe/components";
import { LogOut } from "lucide-react";

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus } from "@/features/auth/types";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";

import { SidebarPendingNavProvider } from "./SidebarPendingNavContext";
import { useDashboardNav } from "./useDashboardNav";
import { useNextSidebarNavigation } from "./useNextSidebarNavigation";

export const DashboardSidebar = () => {
  const { state } = useAuth();
  const logout = useLogout();
  const navigation = useNextSidebarNavigation();
  const { collapsed, toggle } = useSidebarCollapse("outfiqe:web-sidebar-collapsed");
  const { navItems, isBrand, accountLabel } = useDashboardNav();

  if (state.status === AuthStatus.IDLE || state.status === AuthStatus.LOADING) {
    return (
      <aside className={cn("hidden shrink-0 lg:block", sidebarWidthClass(collapsed))}>
        <SidebarSkeleton ariaLabel="Dashboard" collapsed={collapsed} rowCount={7} hasFooter />
      </aside>
    );
  }

  const user = state.user;
  if (!user) return null;

  const { avatarUrl, id, name } = user;

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
          <p className="truncate text-[11px] text-muted-foreground">{accountLabel}</p>
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
    <aside className={cn("hidden shrink-0 lg:block", sidebarWidthClass(collapsed))}>
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
