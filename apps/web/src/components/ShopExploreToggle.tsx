"use client";

import { Compass, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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

type ShopExploreToggleProps = {
  size?: keyof typeof SIZE_STYLES;
  className?: string;
};

type PendingNav = { href: string; fromPathname: string | null };

export const ShopExploreToggle = ({ size = "sm", className }: ShopExploreToggleProps) => {
  const pathname = usePathname();
  const { container, button, icon, showLabel } = SIZE_STYLES[size];
  const [pendingNav, setPendingNav] = useState<PendingNav | null>(null);

  const isExploreRoute = pathname?.startsWith("/explore") ?? false;
  const resolvedHref = isExploreRoute ? "/explore" : "/";

  const activeHref =
    pendingNav && pendingNav.fromPathname === pathname ? pendingNav.href : resolvedHref;

  return (
    <div
      className={cn("flex items-center rounded-full bg-muted font-semibold", container, className)}
    >
      {MODES.map(({ href, label, icon: Icon }) => {
        const active = href === activeHref;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            onClick={() => setPendingNav({ href, fromPathname: pathname })}
            className={cn(
              "flex items-center rounded-full transition-colors",
              button,
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className={cn(icon, "shrink-0")} />
            {showLabel && label}
          </Link>
        );
      })}
    </div>
  );
};
