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
    "List your Nepali clothing brand on Outfiqe. Free to list, a commission only on completed sales, muse looks that show your pieces on real people, and pickup from your door.",
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
    body: "Tell us about your brand using the short form. Our team reviews every application, and once you're approved we email you a link to create your brand account.",
  },
  {
    title: "Set up your shop",
    body: "Add your brand profile, your size scales and the address we collect orders from. Then add your products with photos, sizes, stock and price. Each new product is checked by our team before it goes live.",
  },
  {
    title: "Hand over orders",
    body: "When an order comes in, pack it with the pickup slip. Our rider collects it from your pickup location, so you never need the customer's address. In a few areas, you may send the order yourself instead.",
  },
  {
    title: "Get paid",
    body: "Your earnings from each sale become available 7 days after delivery. Withdraw them to your verified bank account from your wallet.",
  },
];

const value = [
  {
    title: "Free to list",
    body: "No listing fee and no paying for visibility. Shoppers find your pieces through looks, search, the shop and the brand leaderboard.",
  },
  {
    title: "Commission only on sales",
    body: "Outfiqe only earns when you do. Our commission is taken from completed sales, and your wallet shows exactly what you earn on each one.",
  },
  {
    title: "Real people wearing your pieces",
    body: "Nepali muses post looks and tag your products. You approve each tag before it goes live, and can mark a muse as trusted to skip the check next time.",
  },
  {
    title: "One dashboard",
    body: "Products, stock, sale prices, size charts, orders, returns and your wallet, all in one place. Changes to a live product show up straight away.",
  },
];

const faqs = [
  {
    question: "What does it cost to sell on Outfiqe?",
    answer:
      "Listing is free. Outfiqe takes a commission on each completed sale, based on the price of the piece. That's the only deduction: we cover the eSewa and Khalti fees, and when a shopper uses an Outfiqe coupon, we pay for the discount, not you.",
  },
  {
    question: "Who handles delivery?",
    answer:
      "In most areas, we do. Our rider collects ready orders from your pickup location, we check each piece at our hub, and a delivery partner takes the parcel to the customer. Your Orders page shows if any order needs to be sent by you instead.",
  },
  {
    question: "What happens if an order comes back?",
    answer:
      "If a customer refuses a parcel, or a piece fails our quality check, our rider brings the items back to you. You confirm them in your dashboard and the stock goes back on sale.",
  },
  {
    question: "How and when am I paid?",
    answer:
      "Each sale adds to your wallet. The amount becomes available 7 days after delivery, and you can then request a withdrawal to your verified brand bank account. The minimum amount and how often you can withdraw are shown in your wallet.",
  },
  {
    question: "Can I sell secondhand pieces?",
    answer:
      "Yes. Mark a product as Thrift and add a condition rating and a short note about its condition. Thrift pieces get their own section in the shop.",
  },
  {
    question: "Can I edit my products after they're live?",
    answer:
      "Yes. You can edit, restock, set a sale price or remove a live product from your dashboard at any time. Only brand-new products wait for a quick review.",
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
      lede="Outfiqe is the one place Nepali shoppers go for fashion. List your brand, and we'll put your pieces in front of shoppers and the muses who wear them, then collect your orders from your door."
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
      body="Listing is free and the form takes a few minutes. We'll email you once we've reviewed your application."
      primary={{ href: "/apply", label: "Apply now" }}
      secondary={{ href: "/brands", label: "See brands on Outfiqe" }}
    />
  </MarketingShell>
);

export default ForBrandsPage;
