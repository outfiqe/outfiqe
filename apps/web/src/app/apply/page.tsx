import type { Metadata } from "next";
import { Suspense } from "react";

import { BrandApplicationForm } from "@/features/brand-application";

import { ApplyExpiredBanner } from "./ApplyExpiredBanner";

export const metadata: Metadata = { title: "List your brand" };

const ApplyPage = () => {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <span className="text-xs font-bold uppercase tracking-widest text-primary-strong">
        For brands
      </span>
      <h1 className="mt-3 font-display text-4xl font-bold leading-[1.05] text-foreground sm:text-6xl">
        Get your
        <br />
        clothes seen.
      </h1>
      <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
        We&apos;re building the one place Nepali shoppers go for fashion. Listing is free — we only
        earn a small cut when you actually sell.
      </p>

      <Suspense fallback={null}>
        <ApplyExpiredBanner />
      </Suspense>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        <div className="border-t-2 border-foreground pt-3.5">
          <h5 className="text-sm font-bold uppercase tracking-wide text-foreground">
            Free to list
          </h5>
          <p className="mt-1.5 text-sm text-muted-foreground">
            No fee for visibility, ever. Placement is earned by what people love, not what you pay.
          </p>
        </div>
        <div className="border-t-2 border-foreground pt-3.5">
          <h5 className="text-sm font-bold uppercase tracking-wide text-foreground">
            We do the setup
          </h5>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Send us photos and prices. We build your page and your first looks ourselves.
          </p>
        </div>
        <div className="border-t-2 border-foreground pt-3.5">
          <h5 className="text-sm font-bold uppercase tracking-wide text-foreground">
            Creators included
          </h5>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Get your pieces in front of Nepali creators who post real fits and tag your products.
          </p>
        </div>
      </div>

      <div className="mt-12">
        <BrandApplicationForm />
      </div>
    </main>
  );
};

export default ApplyPage;
