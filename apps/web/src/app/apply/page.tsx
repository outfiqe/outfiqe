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
    body: "No listing fee and no paying for visibility. We only earn a commission when you make a sale.",
  },
  {
    title: "We collect your orders",
    body: "Our riders pick up ready orders from your shop, and we deliver them across Nepal.",
  },
  {
    title: "Muses wear your pieces",
    body: "Nepali muses post looks and tag your products, so shoppers see them on real people.",
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
        lede="We're building the one place Nepali shoppers go for fashion. Tell us about your brand below, and we'll email you once we've reviewed your application."
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
