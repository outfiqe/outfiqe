"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Store } from "lucide-react";

import { cn } from "@/shared/lib/cn";

const MODES = [
  { href: "/", label: "Shop", icon: Store },
  { href: "/explore", label: "Explore", icon: Compass },
] as const;

const SIZE_STYLES = {
  sm: { container: "p-1", button: "gap-1.5 px-4 py-1.5 text-sm", icon: "size-4", showLabel: true },
  lg: { container: "p-1.5", button: "px-6 py-3", icon: "size-6", showLabel: false },
} as const;

interface ShopExploreToggleProps {
  size?: keyof typeof SIZE_STYLES;
}

export function ShopExploreToggle({ size = "sm" }: ShopExploreToggleProps) {
  const pathname = usePathname();
  const styles = SIZE_STYLES[size];

  return (
    <div className={cn("flex items-center rounded-full bg-muted font-semibold", styles.container)}>
      {MODES.map((m) => {
        const active = pathname === m.href;
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
