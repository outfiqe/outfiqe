import type { Metadata } from "next";

import {
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
  title: "Sell on Outfiqe",
  description:
    "List your Nepali clothing brand on Outfiqe. Free to list, a small commission only on completed sales, creator looks that show your pieces on real people, and one dashboard for stock and orders.",
  path: "/for-brands",
  keywords: [
    "sell clothes online Nepal",
    "list fashion brand Nepal",
    "Nepali clothing marketplace for brands",
    "Outfiqe for brands",
  ],
});

const steps = [
  {
    title: "Apply",
    body: "Tell us about your brand. We review applications and approve labels that fit Outfiqe.",
  },
  {
    title: "We set you up",
    body: "Send photos and prices. We build your brand page and your first creator looks with you.",
  },
  {
    title: "Sell and get paid",
    body: "Manage stock and orders from your dashboard. Your settlement balance is withdrawn to a verified bank account.",
  },
];

const value = [
  {
    title: "Free to list",
    body: "No listing fee, no fee for visibility. Placement is earned by what shoppers respond to, not what you pay.",
  },
  {
    title: "Commission only on sales",
    body: "Outfiqe takes a small percentage of completed sales. A share of that funds the creator whose look sourced the sale.",
  },
  {
    title: "Creator looks included",
    body: "Your pieces get styled and posted by Nepali creators who tag them — real-world context that a catalogue photo can't give.",
  },
  {
    title: "One dashboard",
    body: "Products, stock, pricing, orders and payouts in one place. Edit a live listing without waiting on a review.",
  },
];

const faqs = [
  {
    question: "What does it cost to sell on Outfiqe?",
    answer:
      "Listing is free. Outfiqe charges a commission on completed sales, calculated per the platform commission structure. Payment-gateway fees on wallet payments are passed through.",
  },
  {
    question: "Who handles delivery?",
    answer:
      "Outfiqe coordinates fulfilment and delivery across Nepal. You prepare and hand over the order; buyer contact details are managed by the platform.",
  },
  {
    question: "How and when am I paid?",
    answer:
      "Each completed sale adds to your brand's settlement balance. Once it clears, you request a withdrawal to a verified brand bank account, subject to the withdrawal policy for businesses.",
  },
  {
    question: "Can I edit my products after they're live?",
    answer:
      "Yes. Restocking, editing and removing a live product are all self-serve from your dashboard. New products go through a short review before they publish.",
  },
];

const ForBrandsPage = () => (
  <MarketingShell
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Sell on Outfiqe", path: "/for-brands" },
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
      lede="Outfiqe is the one place Nepali shoppers go for fashion. List your brand, and get your pieces in front of shoppers and the creators who style them — for real."
    />

    <MarketingSection heading="How it works">
      <StepList steps={steps} />
    </MarketingSection>

    <MarketingSection heading="Why sell here">
      <FeatureGrid items={value} columns={2} />
    </MarketingSection>

    <MarketingSection heading="Brand FAQ">
      <FaqAccordion entries={faqs} withSchema schemaId="for-brands-faq" />
    </MarketingSection>

    <MarketingCta
      title="Apply to list your brand"
      body="Listing is free and takes a few minutes. We'll be in touch after reviewing your application."
      primary={{ href: "/apply", label: "Apply now" }}
      secondary={{ href: "/brands", label: "See brands on Outfiqe" }}
    />
  </MarketingShell>
);

export default ForBrandsPage;
