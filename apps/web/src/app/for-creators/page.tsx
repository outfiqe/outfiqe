import type { Metadata } from "next";
import Link from "next/link";

import {
  ExampleCallout,
  FaqAccordion,
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

const museRoles = [
  {
    title: "What you do",
    body: "Wear pieces from Nepali brands, post looks, tag what you're wearing and share your links.",
  },
  {
    title: "What the brand does",
    body: "Sells the piece, checks your tags and can mark you as trusted so your tags go live straight away.",
  },
  {
    title: "What Outfiqe does",
    body: "Reviews your application, tracks every sale you bring in, and pays your earnings to your verified bank account.",
  },
];

const faqs = [
  {
    question: "What is a look?",
    answer:
      "A look is your outfit photo, with tags on the pieces you're wearing. Shoppers tap a tag to see the price, sizes and brand.",
  },
  {
    question: "Is a muse different from a shopper?",
    answer:
      "A muse is a shopper whose application has been approved. You keep your account and can still shop as normal.",
  },
  {
    question: "Can I tag any clothes?",
    answer:
      "You can tag products listed on Outfiqe. Each brand checks its tags before they go live, unless it has marked you as trusted.",
  },
  {
    question: "Where can shoppers find my looks?",
    answer:
      "In the Explore feed, on your public muse profile and on the page of every product you tag.",
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

    <MarketingSection heading="What is a muse?">
      <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        <p>
          A muse is a real person on Outfiqe who wears clothes from Nepali brands and shares photos
          of the outfits. Shoppers see how a piece looks on a real body, brands get seen, and the
          muse earns a commission when a look leads to a sale.
        </p>
        <p>You don&apos;t buy stock, sell anything yourself or handle any delivery.</p>
      </div>
    </MarketingSection>
    <MarketingSection heading="Who does what">
      <FeatureGrid items={museRoles} />
    </MarketingSection>
    <MarketingSection heading="See it in action">
      <ExampleCallout title="Sita's first sale">
        <p>
          Sita posts a look in a kurta and tags it. The brand approves the tag and the look goes
          live. Maya taps the tag and buys the kurta 2 days later, within the 7-day window, so the
          sale counts for Sita.
        </p>
        <p>
          A pending commission appears in Sita&apos;s Earnings. Once the order is delivered and 7
          more days pass, it becomes ready to withdraw, and she requests it to her verified bank
          account.
        </p>
      </ExampleCallout>
    </MarketingSection>

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

    <MarketingSection heading="Common questions">
      <FaqAccordion entries={faqs} />
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
