"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Heart, Search, ShoppingBag } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import { AccountMenu } from "./AccountMenu";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { ShopExploreToggle } from "./ShopExploreToggle";
import { LEADERBOARD_LINKS } from "./siteNav.constants";

const SCROLL_THRESHOLD = 8;

const SHOP_LINKS = [{ label: "Brands", href: "#" }];

const EXPLORE_LINKS = [
  { label: "Trending", href: "#" },
  { label: "Outfits", href: "#" },
  { label: "Creators", href: "#" },
  { label: "Collections", href: "#" },
  { label: "Trends", href: "#" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [isCondensed, setIsCondensed] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const isExploreRoute = pathname?.startsWith("/explore") ?? false;
  const secondaryLinks = isExploreRoute ? EXPLORE_LINKS : SHOP_LINKS;

  useEffect(() => {
    let ticking = false;
    const update = () => {
      setIsCondensed(window.scrollY > SCROLL_THRESHOLD);
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex justify-center transition-[padding] duration-300",
        isCondensed ? "px-4 pt-3" : "px-0 pt-0",
      )}
    >
      <div
        className={cn(
          "flex w-full items-center gap-4 transition-all duration-300 sm:gap-6",
          isCondensed
            ? "max-w-4xl rounded-full border border-border/60 bg-background/80 px-4 py-2.5 shadow-lg backdrop-blur-md"
            : "max-w-7xl rounded-full border border-transparent bg-background px-6 py-4 shadow-none lg:px-10",
        )}
      >
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
              {secondaryLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="shrink-0 whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {!isExploreRoute && (
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
                    {LEADERBOARD_LINKS.map((sub) => (
                      <Link
                        key={sub.label}
                        href={sub.href}
                        className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
      </div>
    </header>
  );
}
