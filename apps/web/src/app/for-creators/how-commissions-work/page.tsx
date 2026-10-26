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
  title: "How Outfiqe muse commissions work",
  description:
    "A plain guide to Outfiqe muse commissions: which sales count as yours, the 7-day window, when your money is ready, and how withdrawals to your bank account work.",
  path: "/for-creators/how-commissions-work",
  keywords: [
    "how affiliate commissions work",
    "fashion muse commission Nepal",
    "Outfiqe muse payout",
  ],
});

const lifecycle = [
  {
    title: "Pending",
    body: "A shopper taps a product you tagged, or opens your link, and buys it within 7 days. A pending commission appears in your Earnings straight away.",
  },
  {
    title: "Ready to withdraw",
    body: "Once the order is delivered, there is a 7-day return window. When it ends, the commission becomes available. If the order is cancelled, refunded or returned first, the commission is removed.",
  },
  {
    title: "Paid",
    body: "Request a withdrawal from your available balance to a verified bank account. Our team reviews it, sends the money and marks it paid.",
  },
];

const faqs = [
  {
    question: "Which sales count as mine?",
    answer:
      "A sale is yours when the shopper taps a product tag on your look, or opens one of your share links, and then buys within 7 days. A tag only counts once the brand has approved it.",
  },
  {
    question: "What if more than one muse led the shopper there?",
    answer: "The most recent tap or link wins. Only one muse earns on each piece sold.",
  },
  {
    question: "Do I earn when I buy through my own link?",
    answer: "No. Buying through your own tag or link never earns a commission.",
  },
  {
    question: "How much do I earn?",
    answer:
      "Each commission is a fixed amount based on the price of the piece sold. Your Earnings page shows the exact amount for every sale.",
  },
  {
    question: "What happens if the order is cancelled or returned?",
    answer:
      "Any commission that hasn't been paid out yet is removed when the order is cancelled, refunded or returned.",
  },
  {
    question: "How do I withdraw?",
    answer:
      "Add your bank account and upload your bank QR code. If the details match, your account is verified straight away; otherwise our team checks it. Then request a withdrawal from Withdraw. The minimum amount, how often you can withdraw and how long it takes are all shown there.",
  },
];

const HowCommissionsWorkPage = () => (
  <MarketingShell
    width="prose"
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Become a muse", path: "/for-creators" },
      { name: "How commissions work", path: "/for-creators/how-commissions-work" },
    ]}
  >
    <MarketingHero
      eyebrow="For muses"
      title="How commissions work"
      lede="Everything you earn on Outfiqe is tracked for you. Here is how a sale becomes a commission, and how that commission reaches your bank account."
    />

    <MarketingSection heading="From sale to payout">
      <StepList steps={lifecycle} />
    </MarketingSection>

    <MarketingSection heading="What counts as your sale">
      <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        <p>
          A sale is yours when a shopper taps a product you tagged in a look, or opens one of your
          share links, and then buys within <strong>7 days</strong>.
        </p>
        <p>
          A link for one product only counts when the shopper buys that product. A general link
          counts for anything they buy. If more than one muse qualifies, the most recent one earns
          the commission.
        </p>
      </div>
    </MarketingSection>

    <MarketingSection heading="Questions">
      <FaqAccordion entries={faqs} withSchema schemaId="commissions-faq" />
    </MarketingSection>

    <MarketingSection heading="See it for yourself">
      <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
        Once you&apos;re an approved muse, Earnings in your dashboard shows every sale you brought
        in, what you earned and when it will be ready. New here? Start with{" "}
        <Link
          href="/for-creators"
          className="font-medium text-foreground underline underline-offset-2"
        >
          becoming a muse
        </Link>
        .
      </p>
    </MarketingSection>
  </MarketingShell>
);

export default HowCommissionsWorkPage;
