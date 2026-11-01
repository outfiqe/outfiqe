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
} from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Returns & refunds guide",
  description:
    "How cancelling, returning and refunds work on Outfiqe, when you get your money back and how it reaches you.",
  path: "/help/returns",
  keywords: ["Outfiqe returns", "Outfiqe refund", "cancel Outfiqe order"],
});

const situations = [
  {
    title: "You change your plans before it ships",
    body: "Open the order and use Cancel items. You can cancel some or all of your pieces while the brand still has them, free of charge.",
  },
  {
    title: "A piece can't be supplied",
    body: "If a brand can't supply an item, or it fails our quality check at the hub, we refund you. You don't need to ask.",
  },
  {
    title: "It arrives damaged, faulty, wrong or missing",
    body: "Raise a support request within 7 days of delivery, with your order number and photos. We'll arrange a replacement or a full refund at no cost to you.",
  },
  {
    title: "Your parcel is lost or damaged in delivery",
    body: "We refund you in full, including the delivery and handling fees.",
  },
];

const faqs = [
  {
    question: "How will I get my money back?",
    answer:
      "For cash on delivery, if you haven't paid yet, the amount is taken off what you pay the rider. For most online payments, we'll ask you to add a refund account (eSewa, Khalti or bank) on your order page, and our team sends the money there.",
  },
  {
    question: "Where can I see my refund?",
    answer:
      "Your order page lists every refund, why it happened and how the money is coming back to you.",
  },
  {
    question: "Do I need to contact the brand?",
    answer:
      "No. Pieces are sold by independent brands, but Outfiqe handles cancellations, returns and refunds for you.",
  },
  {
    question: "Can I return something because I changed my mind?",
    answer: "Raise a support request with your order number and we'll tell you what we can do.",
  },
  {
    question: "Are Thrift pieces different?",
    answer:
      "Thrift pieces are secondhand. Their condition is described on the product page, and you confirm it before buying.",
  },
];

const ReturnsGuidePage = () => (
  <MarketingShell
    width="prose"
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Help centre", path: "/help" },
      { name: "Returns & refunds", path: "/help/returns" },
    ]}
  >
    <MarketingHero
      eyebrow="Help centre"
      title="Cancelling, returns and refunds"
      lede="Something not right? Here's what happens in each situation, and how your money comes back."
    />

    <MarketingSection heading="What to do in each situation">
      <FeatureGrid items={situations} />
    </MarketingSection>

    <MarketingSection heading="See it in action">
      <ExampleCallout title="Maya's shirt arrives torn">
        <p>
          Maya opens her parcel and finds a torn shirt. Within 7 days, she raises a support request
          with her order number and a photo.
        </p>
        <p>
          Our team reviews it and arranges a replacement or a full refund at no cost to her. She
          doesn&apos;t need to contact the brand, and her order page shows what&apos;s happening.
        </p>
      </ExampleCallout>
    </MarketingSection>

    <MarketingSection heading="Common questions">
      <FaqAccordion entries={faqs} />
    </MarketingSection>

    <MarketingSection heading="The full rules">
      <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
        This page is a plain guide. The full rules are in our{" "}
        <Link
          href="/legal/returns-policy"
          className="font-medium text-foreground underline underline-offset-2"
        >
          return and refund policy
        </Link>
        .
      </p>
    </MarketingSection>

    <MarketingCta
      title="Need to raise a request?"
      body="Have your order number and any photos ready."
      primary={{ href: "/support", label: "Raise a support request" }}
      secondary={{ href: "/help", label: "Go to the help centre" }}
    />
  </MarketingShell>
);

export default ReturnsGuidePage;
