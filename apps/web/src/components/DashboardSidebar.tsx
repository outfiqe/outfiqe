"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GalleryVerticalEnd, LogOut, Package, Store, User } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus, UserRole } from "@/features/auth/types";

const CREATOR_NAV = [
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/posts", label: "Posts", icon: GalleryVerticalEnd },
] as const;

const BRAND_NAV = [
  { href: "/dashboard/profile", label: "Profile", icon: Store },
  { href: "/dashboard/products", label: "Products", icon: Package },
] as const;

export function DashboardSidebar() {
  const pathname = usePathname();
  const { state } = useAuth();
  const logout = useLogout();

  if (state.status === AuthStatus.IDLE || state.status === AuthStatus.LOADING) {
    return <aside className="hidden w-56 shrink-0 lg:block" aria-hidden />;
  }

  const user = state.user;
  if (!user) return null;

  const isBrand = user.role === UserRole.BRAND_OWNER;
  const navItems = isBrand ? BRAND_NAV : CREATOR_NAV;

  return (
    <>
      {/* Mobile — a horizontal tab strip under the header instead of a full sidebar.
          Sign-out already lives in MobileNav's account section, so it isn't repeated here. */}
      <nav className="-mx-4 mb-6 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:hidden">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary-strong"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Desktop — sticky identity + nav column. */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-24 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-4">
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: getAvatarColor(user.id) }}
            >
              {initialsFor(user.name)}
            </span>
            <p className="mt-2.5 truncate text-sm font-semibold text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {isBrand ? "Brand account" : "Creator account"}
            </p>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/15 text-primary-strong"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
          >
            <LogOut className="size-4" />
            {logout.isPending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>
    </>
  );
}
