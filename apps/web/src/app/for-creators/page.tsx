import type { Metadata } from "next";
import Link from "next/link";

import {
  FeatureGrid,
  MarketingCta,
  MarketingHero,
  MarketingSection,
  MarketingShell,
  StepList,
} from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Become an Outfiqe creator",
  description:
    "Post your outfits, tag real products from Nepali brands, and earn a commission every time a look sells a piece. Here's how the Outfiqe creator programme works and how to apply.",
  path: "/for-creators",
  keywords: [
    "become a fashion creator Nepal",
    "earn money posting outfits",
    "fashion affiliate Nepal",
    "Outfiqe creator programme",
  ],
});

const steps = [
  {
    title: "Apply and get approved",
    body: "Sign up, then apply to become a creator from your dashboard. We review new creators before your profile goes live.",
  },
  {
    title: "Post looks, tag products",
    body: "Photograph your outfits and tag the exact pieces from Outfiqe brands. Your looks appear in the feed and on each product's page.",
  },
  {
    title: "Earn on every sale you source",
    body: "When a shopper buys a tagged piece after seeing your look or link, you earn a commission — tracked automatically and withdrawn to your bank.",
  },
];

const perks = [
  {
    title: "Get discovered",
    body: "Your looks surface on the homepage feed, on product pages, and to shoppers exploring your taste — not just to your existing followers.",
  },
  {
    title: "Transparent earnings",
    body: "Every attributed sale, its commission, and its payout status is visible in your earnings dashboard. No guessing.",
  },
  {
    title: "Own your profile",
    body: "A public creator profile at outfiqe with your looks, the brands you wear, and a shareable link for every product.",
  },
  {
    title: "Badges and leaderboards",
    body: "Earn XP and badges for posting, styling and selling, and climb the weekly creator leaderboards.",
  },
];

const ForCreatorsPage = () => (
  <MarketingShell
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Become a creator", path: "/for-creators" },
    ]}
  >
    <MarketingHero
      eyebrow="For creators"
      title={
        <>
          Get paid for
          <br />
          your taste.
        </>
      }
      lede="Outfiqe turns the outfits you already post into income. Tag real products from Nepali brands, and earn a commission every time one of your looks sells a piece."
    />

    <MarketingSection heading="How it works">
      <StepList steps={steps} />
    </MarketingSection>

    <MarketingSection heading="What you get">
      <FeatureGrid items={perks} columns={2} />
    </MarketingSection>

    <MarketingSection heading="How commissions are calculated">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        Commissions are tracked automatically from tag taps and your shareable product links, held
        while the order is fulfilled, and released for withdrawal once it&apos;s delivered and past
        the return window. The full mechanics — the attribution window, what counts as a sale, and
        payout timing — are on the{" "}
        <Link
          href="/for-creators/how-commissions-work"
          className="font-medium text-foreground underline underline-offset-2"
        >
          how commissions work
        </Link>{" "}
        page.
      </p>
    </MarketingSection>

    <MarketingCta
      title="Apply to become a creator"
      body="Create an account, then apply from your dashboard. Approval usually takes a couple of days."
      primary={{ href: "/register", label: "Create an account" }}
      secondary={{ href: "/explore", label: "See creator looks" }}
    />
  </MarketingShell>
);

export default ForCreatorsPage;
