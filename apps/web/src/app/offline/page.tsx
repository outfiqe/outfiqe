import { Button } from "@outfiqe/design-system";
import type { Metadata } from "next";
import Link from "next/link";

import { OfflineRetryButton } from "@/features/pwa";

export const metadata: Metadata = {
  title: "You're offline",
  robots: { index: false, follow: false },
};

const savedDestinations = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore looks" },
  { href: "/shop", label: "Shop" },
  { href: "/wishlist", label: "Wishlist" },
];

const OfflinePage = () => (
  <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
    <p className="text-xs font-bold uppercase tracking-widest text-primary-strong">No connection</p>
    <h1 className="mt-3 font-display text-2xl font-bold text-foreground sm:text-3xl">
      You&apos;re offline
    </h1>
    <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
      This page hasn&apos;t been saved to your device yet. Reconnect to load it, or open a page
      you&apos;ve already visited.
    </p>

    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <OfflineRetryButton />
      <Button asChild variant="outline">
        <Link href="/">Back to home</Link>
      </Button>
    </div>

    <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
      {savedDestinations.map((destination) => (
        <li key={destination.href}>
          <Link
            href={destination.href}
            className="text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
          >
            {destination.label}
          </Link>
        </li>
      ))}
    </ul>
  </main>
);

export default OfflinePage;
