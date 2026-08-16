"use client";

import { HeaderBar, useHeaderCondense } from "@outfiqe/components";
import { ChevronDown, Heart, Search, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/shared/lib/cn";

import { AccountMenu } from "./AccountMenu";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { ShopExploreToggle } from "./ShopExploreToggle";
import { LEADERBOARD_LINKS } from "./siteNav.constants";

const SHOP_LINKS = [{ label: "Brands", href: "/brands" }];

export const SiteHeader = () => {
  const isCondensed = useHeaderCondense();
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  return (
    <HeaderBar condensed={isCondensed}>
      <Logo
        className={cn(
          "shrink-0 origin-left transition-transform duration-300",
          isCondensed && "scale-90",
        )}
      />

      <ShopExploreToggle size="header" className="hidden shrink-0 lg:flex" />

      <div
        className={cn(
          "hidden min-w-0 flex-1 items-center gap-2 rounded-full bg-muted px-4 text-muted-foreground transition-all duration-300 lg:flex",
          isCondensed ? "max-w-sm py-2" : "max-w-md py-2.5",
        )}
      >
        <Search className="size-4 shrink-0" />
        <input
          type="search"
          placeholder="Search fashion, brands & creators"
          className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {!isCondensed && (
        <nav className="hidden min-w-0 shrink items-center gap-x-4 lg:flex">
          <div className="flex min-w-0 shrink items-center gap-x-4 overflow-x-auto [scrollbar-width:none]">
            {SHOP_LINKS.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className="shrink-0 whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </div>

          <div
            className="relative shrink-0"
            onMouseEnter={() => setLeaderboardOpen(true)}
            onMouseLeave={() => setLeaderboardOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1 whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Leaderboard
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform duration-150",
                  leaderboardOpen && "rotate-180",
                )}
              />
            </button>

            <div
              className={cn(
                "absolute left-1/2 top-full z-20 w-48 -translate-x-1/2 pt-2 transition-all duration-150",
                leaderboardOpen
                  ? "visible translate-y-0 opacity-100"
                  : "invisible -translate-y-1 opacity-0",
              )}
            >
              <div className="rounded-xl border border-border bg-card p-2 shadow-lg">
                {LEADERBOARD_LINKS.map(({ href, label }) => (
                  <Link
                    key={label}
                    href={href}
                    className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Link
          href="/search"
          aria-label="Search"
          className="flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted lg:hidden"
        >
          <Search className="size-[18px]" />
        </Link>

        <Link
          href="/wishlist"
          aria-label="Wishlist"
          className="flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <Heart className="size-[18px]" />
        </Link>

        <Link
          href="/cart"
          aria-label="Cart"
          className="relative flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <ShoppingBag className="size-[18px]" />
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            2
          </span>
        </Link>

        <AccountMenu />
        <MobileNav />
      </div>
    </HeaderBar>
  );
};
