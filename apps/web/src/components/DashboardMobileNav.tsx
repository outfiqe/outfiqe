"use client";

import { isNavItemActive } from "@outfiqe/components";
import { LogOut } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus } from "@/features/auth/types";
import { cn } from "@/shared/lib/cn";

import { useDashboardNav } from "./useDashboardNav";

const chipClass =
  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors";

const isCrossAppHref = (href: string): boolean =>
  href.startsWith("http") || href.startsWith("/admin");

export const DashboardMobileNav = () => {
  const { state } = useAuth();
  const logout = useLogout();
  const pathname = usePathname();
  const { navItems } = useDashboardNav();

  if (state.status !== AuthStatus.AUTHENTICATED || !state.user) return null;

  return (
    <nav
      aria-label="Dashboard"
      className="sticky top-[var(--site-header-height,4rem)] z-20 -mx-4 mb-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur lg:hidden"
    >
      <ul className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navItems.map(({ id, href, label, icon: Icon }) => {
          const active = isNavItemActive(href, pathname);
          const content = (
            <>
              {Icon && <Icon className="size-4 shrink-0" />}
              {label}
            </>
          );
          const className = cn(
            chipClass,
            active
              ? "border-transparent bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:text-foreground",
          );

          return (
            <li key={id}>
              {isCrossAppHref(href) ? (
                <a href={href} className={className}>
                  {content}
                </a>
              ) : (
                <NextLink
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={className}
                >
                  {content}
                </NextLink>
              )}
            </li>
          );
        })}

        <li className="shrink-0 pl-1">
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className={cn(
              chipClass,
              "border-border text-muted-foreground hover:text-destructive disabled:opacity-60",
            )}
          >
            <LogOut className="size-4 shrink-0" />
            {logout.isPending ? "Signing out…" : "Sign out"}
          </button>
        </li>
      </ul>
    </nav>
  );
};
