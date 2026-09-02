import type { Metadata } from "next";
import Link from "next/link";

import {
  FaqAccordion,
  MarketingCta,
  MarketingHero,
  MarketingSection,
  MarketingShell,
  StepList,
} from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "How Outfiqe works",
  description:
    "How to shop on Outfiqe: browse creator looks, pick the exact pieces across Nepali brands, add to one cart, and pay cash on delivery or by wallet. Here's the full flow.",
  path: "/how-it-works",
  keywords: [
    "how Outfiqe works",
    "how to shop on Outfiqe",
    "cash on delivery fashion Nepal",
    "creator looks shopping",
  ],
});

const shopperSteps = [
  {
    title: "Find a look",
    body: "Browse the feed of creator looks or search by brand, style or piece. Every look shows the exact products worn.",
  },
  {
    title: "Add to one cart",
    body: "Pick your size and add items from any brand to a single cart. No separate checkouts, no DMs.",
  },
  {
    title: "Pay your way",
    body: "Check out with cash on delivery, eSewa or Khalti. We deliver across Nepal and you can track the order in your account.",
  },
];

const faqs = [
  {
    question: "Do I need an account to shop?",
    answer:
      "You can browse everything without an account. You'll need to sign up and verify your email to save items, check out and track orders.",
  },
  {
    question: "Can I buy from more than one brand in a single order?",
    answer:
      "Yes. Outfiqe is a multi-brand marketplace — add pieces from different Nepali brands to one cart and check out once.",
  },
  {
    question: "How is delivery charged?",
    answer:
      "Delivery is a flat fee based on your delivery area, shown at checkout before you pay. Orders above the free-delivery threshold for your zone ship free. Cash-on-delivery orders add a small handling fee.",
  },
  {
    question: "Can I cancel or return an order?",
    answer:
      "You can cancel an order yourself while it hasn't shipped yet. Once it's on the way, contact us. Return and refund handling is covered in our returns policy.",
  },
  {
    question: "What are the creator looks?",
    answer:
      "Approved Outfiqe creators photograph and post outfits using real products from our brands, and tag the exact pieces. It's how you see the fit and styling before you buy — and how creators earn a commission when their look sells a product.",
  },
];

const HowItWorksPage = () => (
  <MarketingShell
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "How it works", path: "/how-it-works" },
    ]}
  >
    <MarketingHero
      eyebrow="How it works"
      title={
        <>
          Shopping that starts
          <br />
          with an outfit.
        </>
      }
      lede="Outfiqe is built around looks, not listings. You see how a piece is worn by a real person first, then buy it — across every Nepali brand we carry, in one checkout."
    />

    <MarketingSection heading="For shoppers">
      <StepList steps={shopperSteps} />
    </MarketingSection>

    <MarketingSection heading="For creators">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        Approved creators post looks using real products and tag the pieces. When someone taps a
        tagged product or follows a creator&apos;s link and buys it within the attribution window,
        the creator earns a commission — tracked automatically and paid out to a verified bank
        account. See{" "}
        <Link
          href="/for-creators/how-commissions-work"
          className="font-medium text-foreground underline underline-offset-2"
        >
          how commissions work
        </Link>
        .
      </p>
    </MarketingSection>

    <MarketingSection heading="For brands">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        Brands list their catalogue, set stock and pricing, and manage orders from a dashboard.
        Listing is free — Outfiqe takes a small commission only on completed sales, and a share of
        that funds the creator who sourced the sale. More on the{" "}
        <Link
          href="/for-brands"
          className="font-medium text-foreground underline underline-offset-2"
        >
          Sell on Outfiqe
        </Link>{" "}
        page.
      </p>
    </MarketingSection>

    <MarketingSection heading="Common questions">
      <FaqAccordion entries={faqs} withSchema schemaId="how-it-works-faq" />
    </MarketingSection>

    <MarketingCta
      title="Browse the looks"
      body="Every look on Outfiqe is shoppable — tap a piece to see the price, sizes and the brand behind it."
      primary={{ href: "/explore", label: "Explore looks" }}
      secondary={{ href: "/shop", label: "Shop everything" }}
    />
  </MarketingShell>
);

export default HowItWorksPage;
