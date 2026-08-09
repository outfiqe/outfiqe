import Link from "next/link";
import { ChevronDown, Heart, Home, LayoutGrid, Search, ShoppingBag, Trophy } from "lucide-react";

import { Button } from "@/design-system/components/ui/button";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { ShopExploreToggle } from "./ShopExploreToggle";
import { LEADERBOARD_LINKS } from "./siteNav.constants";

export function SiteHeader() {
  return (
    <header className="relative flex items-center justify-between gap-6 px-6 py-3 lg:px-10">
      <div className="flex items-center gap-10">
        <Logo />
        <nav className="hidden items-center gap-5 text-sm lg:flex xl:gap-7">
          <Link
            href="/"
            aria-label="Home"
            className="flex items-center gap-1.5 font-semibold text-foreground"
          >
            <Home className="size-4 shrink-0" />
            <span className="hidden xl:inline">Home</span>
          </Link>
          <Link
            href="#"
            aria-label="Collections"
            className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <LayoutGrid className="size-4 shrink-0" />
            <span className="hidden xl:inline">Collections</span>
          </Link>
          <div className="group relative">
            <Link
              href="#"
              aria-label="Brand leaderboard"
              className="flex items-center gap-1.5 py-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Trophy className="size-4 shrink-0" />
              <span className="hidden xl:inline">Brand leaderboard</span>
              <ChevronDown className="size-4 transition-transform group-hover:rotate-180" />
            </Link>

            <div className="invisible absolute left-0 top-full z-20 w-52 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="rounded-xl border border-border bg-card p-2 shadow-lg">
                {LEADERBOARD_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </div>

      <div className="hidden items-center gap-4 lg:flex">
        <ShopExploreToggle />

        <div className="hidden items-center gap-2 rounded-full bg-muted px-4 py-2.5 text-muted-foreground lg:flex">
          <Search className="size-4 shrink-0" />
          <input
            type="search"
            placeholder="Search kurta, kastha, creators"
            className="w-40 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground xl:w-56"
          />
        </div>
      </div>

      <div className="flex items-center gap-5">
        <Link href="/wishlist" aria-label="Wishlist" className="text-foreground">
          <Heart className="size-5" />
        </Link>
        <Link href="/cart" aria-label="Cart" className="relative text-foreground">
          <ShoppingBag className="size-5" />
          <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            2
          </span>
        </Link>

        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">Sign up</Link>
          </Button>
        </div>

        <MobileNav />
      </div>
    </header>
  );
}
