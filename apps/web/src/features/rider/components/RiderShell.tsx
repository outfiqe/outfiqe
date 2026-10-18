import Link from "next/link";
import type { ReactNode } from "react";

import { RiderLogoutButton } from "./RiderLogoutButton";

const RIDER_NAV_LINKS = [
  { href: "/rider", label: "Visits" },
  { href: "/rider/earnings", label: "Earnings" },
];

type RiderShellProps = {
  riderName: string;
  children: ReactNode;
};

export const RiderShell = ({ riderName, children }: RiderShellProps) => (
  <div className="min-h-dvh bg-background">
    <header className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3">
      <div className="flex items-center justify-between">
        <Link href="/rider" className="font-display text-lg font-bold text-foreground">
          Outfiqe Rider
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{riderName}</span>
          <RiderLogoutButton />
        </div>
      </div>
      <nav aria-label="Rider" className="mt-2 flex gap-4 text-sm">
        {RIDER_NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="font-medium text-muted-foreground hover:text-foreground focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
    <main className="mx-auto max-w-lg px-4 py-5">{children}</main>
  </div>
);
