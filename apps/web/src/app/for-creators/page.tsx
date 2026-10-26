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
  title: "Become an Outfiqe muse",
  description:
    "Share your outfits, tag real pieces from Nepali brands, and earn a commission when your looks lead to a sale. How the Outfiqe muse programme works and how to apply.",
  path: "/for-creators",
  keywords: [
    "become a fashion muse Nepal",
    "earn money from outfits",
    "fashion affiliate Nepal",
    "Outfiqe muse programme",
  ],
});

const steps = [
  {
    title: "Apply and get approved",
    body: "Create a shopper account, then apply to become a muse from your dashboard. Our team reviews every application, and we'll email you once you're approved.",
  },
  {
    title: "Post looks and tag the pieces",
    body: "Upload a photo of your outfit and tag the Outfiqe products you're wearing. Each brand checks its tags before they go live, and brands can mark you as trusted so your future tags go live straight away.",
  },
  {
    title: "Earn when your looks sell",
    body: "When a shopper taps your tag or opens your link and buys that piece within 7 days, you earn a commission. You can follow every sale in Earnings and withdraw the money to your bank account.",
  },
];

const perks = [
  {
    title: "Get discovered",
    body: "Your looks appear in the Explore feed and on the page of every product you tag, so new shoppers find you, not just your followers.",
  },
  {
    title: "Clear earnings",
    body: "Earnings shows every sale you brought in, what you earned on it, and whether it's pending, ready to withdraw or paid.",
  },
  {
    title: "Your own profile and links",
    body: "You get a public muse profile with all your looks, plus share links for any product that you can post on Instagram, TikTok or WhatsApp.",
  },
  {
    title: "Badges, challenges and leaderboards",
    body: "Earn points and badges for posting and selling, take part in challenges, and climb the muse leaderboard.",
  },
];

const ForCreatorsPage = () => (
  <MarketingShell
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Become a muse", path: "/for-creators" },
    ]}
  >
    <MarketingHero
      eyebrow="For muses"
      title={
        <>
          Get paid for
          <br />
          your taste.
        </>
      }
      lede="Outfiqe turns the outfits you already wear into income. Tag real pieces from Nepali brands, and earn a commission every time one of your looks leads to a sale."
    />

    <MarketingSection heading="How it works">
      <StepList steps={steps} />
    </MarketingSection>

    <MarketingSection heading="What you get">
      <FeatureGrid items={perks} columns={2} />
    </MarketingSection>

    <MarketingSection heading="How you get paid">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        Your commission is a fixed amount based on the price of the piece sold. It shows as pending
        while the order is on its way, and becomes ready to withdraw 7 days after delivery. You then
        request a withdrawal to a verified bank account. The full details are on the{" "}
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
      title="Apply to become a muse"
      body="Create an account, then apply from your dashboard. We'll email you as soon as you're approved."
      primary={{ href: "/register", label: "Create an account" }}
      secondary={{ href: "/explore", label: "See muse looks" }}
    />
  </MarketingShell>
);

export default ForCreatorsPage;
