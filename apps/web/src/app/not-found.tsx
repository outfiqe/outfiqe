import { Button } from "@outfiqe/design-system";
import type { Metadata } from "next";
import Link from "next/link";

import { MobileTabBar } from "@/components/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const popularDestinations = [
  { href: "/shop", label: "Shop everything" },
  { href: "/collections", label: "Collections" },
  { href: "/brands", label: "Brands" },
  { href: "/explore", label: "Explore looks" },
  { href: "/how-it-works", label: "How Outfiqe works" },
  { href: "/help", label: "Help centre" },
];

const NotFound = () => (
  <div className="pb-20 lg:pb-0">
    <SiteHeader />
    <main className="mx-auto max-w-2xl px-6 py-20 text-center lg:px-10">
      <p className="text-xs font-bold uppercase tracking-widest text-primary-strong">404</p>
      <h1 className="mt-3 font-display text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
        We can&apos;t find that page
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
        The link may be broken or the page may have moved. Here&apos;s where most people go next.
      </p>

      <div className="mt-6 flex justify-center">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>

      <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
        {popularDestinations.map((destination) => (
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
    <SiteFooter />
    <MobileTabBar />
  </div>
);

export default NotFound;
