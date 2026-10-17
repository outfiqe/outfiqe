import Link from "next/link";
import type { ReactNode } from "react";

import { RiderLogoutButton } from "./RiderLogoutButton";

type RiderShellProps = {
  riderName: string;
  children: ReactNode;
};

export const RiderShell = ({ riderName, children }: RiderShellProps) => (
  <div className="min-h-dvh bg-background">
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3">
      <Link href="/rider" className="font-display text-lg font-bold text-foreground">
        Outfiqe Rider
      </Link>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{riderName}</span>
        <RiderLogoutButton />
      </div>
    </header>
    <main className="mx-auto max-w-lg px-4 py-5">{children}</main>
  </div>
);
