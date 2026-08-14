"use client";

import { Compass, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/shared/lib/cn";

const MODES = [
  { href: "/", label: "Shop", icon: Store },
  { href: "/explore", label: "Explore", icon: Compass },
] as const;

const SIZE_STYLES = {
  sm: { container: "p-1", button: "gap-1.5 px-4 py-1.5 text-sm", icon: "size-4", showLabel: true },
  header: {
    container: "p-1",
    button: "gap-2 px-5 py-2 text-base",
    icon: "size-5",
    showLabel: true,
  },
  lg: { container: "p-1.5", button: "px-6 py-3", icon: "size-6", showLabel: false },
  icon: { container: "p-1", button: "px-3 py-1.5", icon: "size-4", showLabel: false },
} as const;

interface ShopExploreToggleProps {
  size?: keyof typeof SIZE_STYLES;
  className?: string;
}

export function ShopExploreToggle({ size = "sm", className }: ShopExploreToggleProps) {
  const pathname = usePathname();
  const styles = SIZE_STYLES[size];
  // "Explore" only owns its own subtree; every other route (shop, product,
  // brand/creator profiles, wishlist, dashboard) reads as "Shop" so the
  // toggle always has exactly one side lit up instead of going dark on
  // pages that aren't the literal "/" or "/explore" href.
  const isExploreRoute = pathname?.startsWith("/explore") ?? false;

  return (
    <div
      className={cn(
        "flex items-center rounded-full bg-muted font-semibold",
        styles.container,
        className,
      )}
    >
      {MODES.map((m) => {
        const active = m.href === "/explore" ? isExploreRoute : !isExploreRoute;
        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={active ? "page" : undefined}
            aria-label={m.label}
            className={cn(
              "flex items-center rounded-full transition-colors",
              styles.button,
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <m.icon className={cn(styles.icon, "shrink-0")} />
            {styles.showLabel && m.label}
          </Link>
        );
      })}
    </div>
  );
}
