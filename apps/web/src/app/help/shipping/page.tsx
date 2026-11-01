import type { Metadata } from "next";
import Link from "next/link";

import {
  ExampleCallout,
  FaqAccordion,
  MarketingCta,
  MarketingHero,
  MarketingSection,
  MarketingShell,
  StepList,
} from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Shipping & delivery guide",
  description:
    "How your Outfiqe order reaches you: from the brand to our hub to your door, what delivery costs, and how to follow your parcel.",
  path: "/help/shipping",
  keywords: ["Outfiqe delivery", "delivery in Nepal", "track Outfiqe order"],
});

const deliverySteps = [
  {
    title: "You place your order",
    body: "Enter your city at checkout. We show your delivery fee and expected dates before you pay.",
  },
  {
    title: "Our rider collects it",
    body: "For most brands, an Outfiqe rider picks up your pieces from the brand.",
  },
  {
    title: "We check it at our hub",
    body: "We check each piece and pack your whole order into one parcel.",
  },
  {
    title: "A delivery partner brings it to you",
    body: "A courier company takes the parcel to your door and calls you to arrange the handover. Keep your phone on.",
  },
];

const faqs = [
  {
    question: "What will delivery cost?",
    answer:
      "It depends on your delivery zone. Each zone has its own fee, charged once per order, and orders at or above your zone's free-delivery threshold ship free. Cash on delivery adds a small handling fee. You see every fee before you order.",
  },
  {
    question: "How long will it take?",
    answer:
      "It depends on where you live. The expected dates are on your checkout and order pages. They are estimates, not guaranteed dates.",
  },
  {
    question: "How do I follow my parcel?",
    answer:
      "Sign in and open Your orders. The order page shows each step and links to the delivery partner's own tracking page.",
  },
  {
    question: "Why did part of my order arrive separately?",
    answer:
      "A few brands still send their part of the order themselves. Your order page shows those as a separate delivery.",
  },
  {
    question: "What if nobody is home?",
    answer: "If a delivery attempt fails, the delivery partner will try again.",
  },
  {
    question: "What if I refuse a cash-on-delivery parcel?",
    answer:
      "You pay nothing, including the delivery and handling fees. After 2 refused deliveries within a year, cash on delivery is no longer offered on that account or phone number, but you can still pay online.",
  },
  {
    question: "My order says delivered, but I didn't get it.",
    answer:
      'Open the order and tap "I didn\'t receive this" on the parcel within 3 days of delivery. Our team will look into it with the delivery partner.',
  },
];

const ShippingGuidePage = () => (
  <MarketingShell
    width="prose"
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Help centre", path: "/help" },
      { name: "Shipping & delivery", path: "/help/shipping" },
    ]}
  >
    <MarketingHero
      eyebrow="Help centre"
      title="How your order reaches you"
      lede="Outfiqe delivers within Nepal. Even if you buy from several brands, most orders arrive together in one parcel."
    />

    <MarketingSection heading="The journey, step by step">
      <StepList steps={deliverySteps} />
    </MarketingSection>

    <MarketingSection heading="See it in action">
      <ExampleCallout title="Maya orders from two brands">
        <p>
          Maya adds a kurta from one brand and a bag from another to the same cart. She enters her
          city, sees the delivery fee and dates, and pays once.
        </p>
        <p>
          Our rider collects both pieces, we check them at our hub and pack them together. A
          delivery partner then calls Maya and brings the one parcel to her door.
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
          href="/legal/shipping-policy"
          className="font-medium text-foreground underline underline-offset-2"
        >
          shipping and delivery policy
        </Link>
        .
      </p>
    </MarketingSection>

    <MarketingCta
      title="Need help with an order?"
      body="Tell us your order number and we'll look into it."
      primary={{ href: "/support", label: "Raise a support request" }}
      secondary={{ href: "/help", label: "Go to the help centre" }}
    />
  </MarketingShell>
);

export default ShippingGuidePage;
