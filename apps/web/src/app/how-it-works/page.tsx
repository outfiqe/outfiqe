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
    "How to shop on Outfiqe. See pieces on real muses, add from any Nepali brand to one cart, pay by cash on delivery or eSewa, and follow your parcel to your door.",
  path: "/how-it-works",
  keywords: [
    "how Outfiqe works",
    "how to shop on Outfiqe",
    "cash on delivery fashion Nepal",
    "muse looks shopping",
  ],
});

const shopperSteps = [
  {
    title: "Find a look",
    body: "Browse muse looks, the shop, Thrift and the brand leaderboard, or search by brand, style or piece. Every look links to the exact products worn.",
  },
  {
    title: "Add to one cart",
    body: "Pick your size and add pieces from any brand to a single cart. Enter your city to see the delivery fee before you check out.",
  },
  {
    title: "Pay your way",
    body: "Pay with cash on delivery or eSewa. Your order page shows the payment, the expected delivery date and every step of the delivery.",
  },
  {
    title: "Get one parcel",
    body: "For most brands, our rider collects your pieces, we check them at our hub and pack your order into one parcel. A delivery partner then brings it to your door.",
  },
];

const faqs = [
  {
    question: "Do I need an account to shop?",
    answer:
      "You can browse everything without an account. To check out, save pieces and follow your orders, sign up and verify your email.",
  },
  {
    question: "Can I buy from more than one brand in a single order?",
    answer:
      "Yes. Add pieces from different Nepali brands to one cart and check out once. Where the brands are collected by Outfiqe, everything arrives together in one parcel.",
  },
  {
    question: "How is delivery charged?",
    answer:
      "Each delivery zone has its own delivery fee and a free-delivery threshold. Both show in your cart and at checkout before you pay. Cash on delivery adds a small handling fee for your zone.",
  },
  {
    question: "Can I cancel?",
    answer:
      "Yes, before your order ships. Open the order and use Cancel items to drop some or all of it. If that button isn't there, raise a support request and we'll cancel it for you.",
  },
  {
    question: "What is Thrift?",
    answer:
      "Thrift pieces are secondhand or one-of-a-kind items listed by brands. Each one shows a condition rating and a note, and we ask you to confirm you know it's secondhand before you buy.",
  },
  {
    question: "What are muse looks?",
    answer:
      "Approved muses photograph outfits and tag the exact pieces they're wearing. A brand checks each tag before it goes live, so the product you tap is the one in the photo. Muses earn a commission when their look leads to a sale.",
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
      lede="Outfiqe is built around looks, not listings. You see a piece on a real person first, buy it from the Nepali brand that made it, and follow it all the way to your door."
    />

    <MarketingSection heading="For shoppers">
      <StepList steps={shopperSteps} />
    </MarketingSection>

    <MarketingSection heading="For muses & brands">
      <div className="grid gap-10 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Muses</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Approved muses drop looks and tag the pieces they wear. When a shopper taps a tag or
            opens a muse&apos;s link and buys within 7 days, the muse earns a commission. It shows
            as pending, becomes available 7 days after delivery, and is withdrawn to a verified bank
            account. See{" "}
            <Link
              href="/for-creators/how-commissions-work"
              className="font-medium text-foreground underline underline-offset-2"
            >
              how commissions work
            </Link>
            .
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Brands</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Brands list their pieces, set sizes, stock and sale prices, and approve the muse tags on
            their products. Our riders collect ready orders from the brand&apos;s pickup location,
            and earnings are withdrawn to a verified bank account. Listing is free; Outfiqe takes a
            commission on completed sales. More on the{" "}
            <Link
              href="/for-brands"
              className="font-medium text-foreground underline underline-offset-2"
            >
              Sell on Outfiqe
            </Link>{" "}
            page.
          </p>
        </div>
      </div>
    </MarketingSection>

    <MarketingSection heading="Common questions">
      <FaqAccordion entries={faqs} withSchema schemaId="how-it-works-faq" />
    </MarketingSection>

    <MarketingCta
      title="Browse the looks"
      body="Every look on Outfiqe is shoppable. Tap a piece to see its price, sizes and the brand behind it."
      primary={{ href: "/explore", label: "Explore looks" }}
      secondary={{ href: "/shop", label: "Shop everything" }}
    />
  </MarketingShell>
);

export default HowItWorksPage;
