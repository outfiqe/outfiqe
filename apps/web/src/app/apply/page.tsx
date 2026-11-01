import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BrandApplicationForm } from "@/features/brand-application";
import {
  FeatureGrid,
  MarketingHero,
  MarketingSection,
  MarketingShell,
  StepList,
} from "@/features/marketing";

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

const nextSteps = [
  {
    title: "We review your application",
    body: "Our team looks at every brand. Have your Instagram or TikTok ready, because it's how we get to know your work.",
  },
  {
    title: "We email you",
    body: "If you're approved, we send a link to create your brand account.",
  },
  {
    title: "You set up your shop",
    body: "Add your brand profile, size scales, pickup address and products. We check each new product before it goes live.",
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

      <MarketingSection heading="What happens after you apply">
        <StepList steps={nextSteps} />
        <p className="mt-6 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Want to know more first? Read about{" "}
          <Link
            href="/for-brands"
            className="font-medium text-foreground underline underline-offset-2"
          >
            selling on Outfiqe
          </Link>
          .
        </p>
      </MarketingSection>

      <div className="mt-12">
        <BrandApplicationForm />
      </div>
    </MarketingShell>
  );
};

export default ApplyPage;
