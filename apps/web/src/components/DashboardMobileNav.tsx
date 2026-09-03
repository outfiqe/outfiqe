"use client";

import { isNavItemActive } from "@outfiqe/components";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus } from "@/features/auth/types";
import { cn } from "@/shared/lib/cn";

import { useDashboardNav } from "./useDashboardNav";

const SCROLL_END_TOLERANCE_PX = 4;
const SCROLL_STEP_PX = 160;

const chipClass =
  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors";

const isCrossAppHref = (href: string): boolean =>
  href.startsWith("http") || href.startsWith("/admin");

export const DashboardMobileNav = () => {
  const { state } = useAuth();
  const logout = useLogout();
  const pathname = usePathname();
  const { navItems } = useDashboardNav();

  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);

  const updateScrollability = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setCanScrollStart(scroller.scrollLeft > SCROLL_END_TOLERANCE_PX);
    setCanScrollEnd(
      scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - SCROLL_END_TOLERANCE_PX,
    );
  };

  useEffect(() => {
    updateScrollability();
    window.addEventListener("resize", updateScrollability);
    return () => window.removeEventListener("resize", updateScrollability);
  }, [navItems.length]);

  const scrollByStep = (direction: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: direction * SCROLL_STEP_PX, behavior: "smooth" });
  };

  if (state.status !== AuthStatus.AUTHENTICATED || !state.user) return null;

  return (
    <nav
      aria-label="Dashboard"
      className="sticky top-[var(--site-header-height,4rem)] z-20 -mx-4 mb-4 border-b border-border bg-background/95 backdrop-blur lg:hidden"
    >
      <div className="relative">
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent transition-opacity",
            canScrollStart ? "opacity-100" : "opacity-0",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent transition-opacity",
            canScrollEnd ? "opacity-100" : "opacity-0",
          )}
        />

        {canScrollStart && (
          <button
            type="button"
            onClick={() => scrollByStep(-1)}
            aria-label="Show earlier sections"
            className="absolute left-1 top-1/2 z-20 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm"
          >
            <ChevronLeft className="size-3.5" />
          </button>
        )}
        {canScrollEnd && (
          <button
            type="button"
            onClick={() => scrollByStep(1)}
            aria-label="Show more sections"
            className="absolute right-1 top-1/2 z-20 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm"
          >
            <ChevronRight className="size-3.5" />
          </button>
        )}

        <ul
          ref={scrollerRef}
          onScroll={updateScrollability}
          className="flex items-center gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
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
      </div>
    </nav>
  );
};
