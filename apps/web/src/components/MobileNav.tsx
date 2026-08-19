"use client";

import { Button } from "@outfiqe/design-system";
import { ChevronDown, Menu, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus } from "@/features/auth/types";
import { ExploreSearchBox, ProductSearchBox } from "@/features/search";
import { cn } from "@/shared/lib/cn";
import { isExploreRoute } from "@/shared/lib/exploreMode";

import { LEADERBOARD_LINKS, NAV_LINKS } from "./siteNav.constants";

export const MobileNav = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const { state, isAuthenticated } = useAuth();
  const logout = useLogout();

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-foreground"
      >
        {open ? <X className="size-6" /> : <Menu className="size-6" />}
      </Button>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 max-h-[calc(100vh-72px)] overflow-y-auto border-t border-border bg-background px-6 py-6 shadow-lg">
          {isExploreRoute(pathname) ? (
            <ExploreSearchBox
              placeholder="Search creators & posts"
              formClassName="flex items-center gap-2 rounded-full bg-muted px-4 py-2.5 text-muted-foreground"
              onNavigate={() => setOpen(false)}
            />
          ) : (
            <ProductSearchBox
              placeholder="Search kurta, kastha, jackets"
              formClassName="flex items-center gap-2 rounded-full bg-muted px-4 py-2.5 text-muted-foreground"
              onNavigate={() => setOpen(false)}
            />
          )}

          <nav className="mt-6 flex flex-col gap-1 text-sm">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-2 py-2.5",
                  href === "/"
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {label}
              </Link>
            ))}

            <Button
              variant="ghost"
              onClick={() => setLeaderboardOpen((v) => !v)}
              aria-expanded={leaderboardOpen}
              className="h-auto justify-between rounded-lg px-2 py-2.5 font-normal text-muted-foreground hover:text-foreground"
            >
              Brand leaderboard
              <ChevronDown
                className={cn("size-4 transition-transform", leaderboardOpen && "rotate-180")}
              />
            </Button>
            {leaderboardOpen && (
              <div className="ml-2 flex flex-col gap-1 border-l border-border pl-4">
                {LEADERBOARD_LINKS.map(({ href, label }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </nav>

          <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6">
            {state.status === AuthStatus.IDLE ||
            state.status === AuthStatus.LOADING ? null : isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  <User className="size-4 shrink-0" />
                  {state.user?.name}
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    logout.mutate();
                  }}
                  disabled={logout.isPending}
                >
                  {logout.isPending ? "Signing out…" : "Sign out"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link href="/login" onClick={() => setOpen(false)}>
                    Log in
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/register" onClick={() => setOpen(false)}>
                    Sign up
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
