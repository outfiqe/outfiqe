import type { Metadata } from "next";
import { Suspense } from "react";

import { BrandApplicationForm } from "@/features/brand-application";
import { FeatureGrid, MarketingHero, MarketingShell } from "@/features/marketing";

import { ApplyExpiredBanner } from "./ApplyExpiredBanner";

export const metadata: Metadata = { title: "List your brand" };

export const dynamic = "force-dynamic";

const brandPerks = [
  {
    title: "Free to list",
    body: "No fee for visibility, ever. Placement is earned by what people love, not what you pay.",
  },
  {
    title: "We do the setup",
    body: "Send us photos and prices. We build your page and your first looks ourselves.",
  },
  {
    title: "Creators included",
    body: "Get your pieces in front of Nepali creators who post real fits and tag your products.",
  },
];

const ApplyPage = () => {
  return (
    <MarketingShell
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "List your brand", path: "/apply" },
      ]}
    >
      <MarketingHero
        eyebrow="For brands"
        title={
          <>
            Get your
            <br />
            clothes seen.
          </>
        }
        lede="We're building the one place Nepali shoppers go for fashion. Listing is free — we only earn a small cut when you actually sell."
      >
        <Suspense fallback={null}>
          <ApplyExpiredBanner />
        </Suspense>
      </MarketingHero>

      <div className="mt-12">
        <FeatureGrid items={brandPerks} />
      </div>

      <div className="mt-12">
        <BrandApplicationForm />
      </div>
    </MarketingShell>
  );
};

export default ApplyPage;
