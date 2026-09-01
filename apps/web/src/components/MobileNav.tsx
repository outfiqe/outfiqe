"use client";

import { Button, useTheme } from "@outfiqe/design-system";
import { ChevronDown, Heart, Menu, Moon, ShoppingBag, Sun, User, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAuth, useLogout } from "@/features/auth";
import { AuthStatus } from "@/features/auth/types";
import { ADMIN_URL } from "@/features/auth/utils/getDefaultRoute";
import { useCart } from "@/features/cart";
import { cn } from "@/shared/lib/cn";

import { LEADERBOARD_LINKS, NAV_LINKS } from "./siteNav.constants";

export const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const { state, isAuthenticated, isAdmin } = useAuth();
  const logout = useLogout();
  const { data: cart } = useCart();
  const cartCount = cart?.itemCount ?? 0;
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

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
          <nav className="flex flex-col gap-1 text-sm">
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

          <div className="mt-6 flex flex-col gap-1 border-t border-border pt-6 text-sm">
            <Link
              href="/wishlist"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Heart className="size-4 shrink-0" />
              Wishlist
            </Link>
            <Link
              href="/cart"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ShoppingBag className="size-4 shrink-0" />
              Bag
              {cartCount > 0 && (
                <span className="ml-auto flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {isDark ? (
                <Sun className="size-4 shrink-0" suppressHydrationWarning />
              ) : (
                <Moon className="size-4 shrink-0" suppressHydrationWarning />
              )}
              Theme
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6">
            {state.status === AuthStatus.IDLE ||
            state.status === AuthStatus.LOADING ? null : isAuthenticated ? (
              <>
                {isAdmin ? (
                  <a
                    href={ADMIN_URL}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
                  >
                    <User className="size-4 shrink-0" />
                    Dashboard
                  </a>
                ) : (
                  <Link
                    href="/profile"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
                  >
                    <User className="size-4 shrink-0" />
                    {state.user?.name}
                  </Link>
                )}
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
