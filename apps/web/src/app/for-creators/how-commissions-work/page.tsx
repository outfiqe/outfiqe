import type { Metadata } from "next";
import Link from "next/link";

import {
  FaqAccordion,
  MarketingHero,
  MarketingSection,
  MarketingShell,
  StepList,
} from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "How Outfiqe creator commissions work",
  description:
    "A plain explanation of Outfiqe creator commissions: how a sale is attributed to your look or link, the attribution window, when a commission is approved, and how withdrawals are paid.",
  path: "/for-creators/how-commissions-work",
  keywords: [
    "how affiliate commissions work",
    "fashion creator commission Nepal",
    "Outfiqe creator payout",
  ],
});

const lifecycle = [
  {
    title: "Attributed",
    body: "A shopper taps a product you tagged in a look, or follows your shareable link, then buys that product within the attribution window. A pending commission is created on that order.",
  },
  {
    title: "Approved",
    body: "The order is delivered and clears the return window. Cancelled or refunded orders never reach this stage — their commissions are voided.",
  },
  {
    title: "Paid",
    body: "You request a withdrawal against your available balance to a verified bank account. Once an admin marks it paid, the commission is settled.",
  },
];

const faqs = [
  {
    question: "What is the attribution window?",
    answer:
      "If a shopper buys a product you sourced within 7 days of tapping your tag or link, the sale is credited to you. The most recent qualifying tap or link wins if there is more than one.",
  },
  {
    question: "Do I earn if I buy through my own link?",
    answer:
      "No. A purchase where the buyer is the creator is never attributed — self-referrals earn nothing.",
  },
  {
    question: "What happens if the order is cancelled or refunded?",
    answer:
      "A commission that is still pending is voided if the order is cancelled before shipping or the payment fails. Approved and available commissions are handled case by case.",
  },
  {
    question: "How and when do I get paid?",
    answer:
      "Your available balance is the sum of your approved commissions. You submit a withdrawal request to a verified bank account, subject to the minimum amount and request window in the withdrawal policy. An admin reviews and marks it paid.",
  },
  {
    question: "Are commissions the same for every product?",
    answer:
      "Commission rates are set per the platform's commission structure and can vary. Your earnings dashboard shows the exact commission recorded for each attributed sale.",
  },
];

const HowCommissionsWorkPage = () => (
  <MarketingShell
    width="prose"
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Become a creator", path: "/for-creators" },
      { name: "How commissions work", path: "/for-creators/how-commissions-work" },
    ]}
  >
    <MarketingHero
      eyebrow="For creators"
      title="How commissions work"
      lede="Everything you earn on Outfiqe is tracked automatically. This is exactly how a sale becomes a commission, and how that commission becomes money in your account."
    />

    <MarketingSection heading="The lifecycle of a commission">
      <StepList steps={lifecycle} />
    </MarketingSection>

    <MarketingSection heading="What counts as your sale">
      <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        <p>
          A sale is credited to you when a shopper takes an action that points at a product you
          sourced — tapping a product you tagged in a look, or opening one of your shareable product
          links — and then buys that product within <strong>7 days</strong>.
        </p>
        <p>
          If more than one creator&apos;s tap or link qualifies, the most recent one is credited. A
          general profile link counts for whatever the shopper actually buys; a product-specific
          link only counts for that product.
        </p>
      </div>
    </MarketingSection>

    <MarketingSection heading="Questions">
      <FaqAccordion entries={faqs} withSchema schemaId="commissions-faq" />
    </MarketingSection>

    <MarketingSection heading="See it for yourself">
      <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
        Your{" "}
        <Link
          href="/for-creators"
          className="font-medium text-foreground underline underline-offset-2"
        >
          creator dashboard
        </Link>{" "}
        shows every attributed sale, its commission and its payout status in real time.
      </p>
    </MarketingSection>
  </MarketingShell>
);

export default HowCommissionsWorkPage;
