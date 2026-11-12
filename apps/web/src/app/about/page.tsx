import type { Metadata } from "next";
import Link from "next/link";

import {
  ExampleCallout,
  FeatureGrid,
  MarketingCta,
  MarketingHero,
  MarketingSection,
  MarketingShell,
} from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "About Outfiqe",
  description:
    "Outfiqe is a Nepali fashion marketplace. Local brands and thrift pieces, shown on real muses, in one bag, delivered as one parcel. What we are building, and why.",
  path: "/about",
  keywords: ["about Outfiqe", "Nepali fashion marketplace", "Outfiqe company"],
});

const principles = [
  {
    title: "Local brands first",
    body: "Every brand on Outfiqe is a Nepali label, alongside secondhand pieces in Thrift. We help small studios reach shoppers they couldn't reach alone, and we only earn when they sell.",
  },
  {
    title: "See the fit before you buy",
    body: "A photo on a hanger tells you very little. Muse looks show each piece on a real person, and reviews come only from people who actually received the item.",
  },
  {
    title: "One cart, one parcel",
    body: "Shop across brands in one checkout. We collect from each brand, check every piece at our hub and send your order as one parcel you can follow step by step.",
  },
  {
    title: "Muses earn for taste",
    body: "When someone buys a piece because of a muse's look, that muse earns a commission. We track it for them and pay it into their bank account.",
  },
];

const roles = [
  {
    title: "Shoppers",
    body: "People looking for clothes. They find pieces through looks and the shop, then buy from many brands in one bag.",
  },
  {
    title: "Brands",
    body: "Nepali clothing labels. They make or source the pieces, set the prices and keep their stock up to date.",
  },
  {
    title: "Muses",
    body: "Real people who wear those pieces, share photos called looks, and earn a commission when a look leads to a sale.",
  },
  {
    title: "Outfiqe",
    body: "The place that connects them. We run the store, take payment, collect orders from brands, check them at our hub, arrange delivery and handle refunds.",
  },
];

const AboutPage = () => (
  <MarketingShell
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "About", path: "/about" },
    ]}
  >
    <MarketingHero
      eyebrow="About"
      title={
        <>
          The one place Nepali
          <br />
          shoppers go for fashion.
        </>
      }
      lede="Outfiqe brings Nepal's clothing brands together in one storefront and shows every piece on real muses. Shopping starts with an outfit you like, not a search box."
    />

    <MarketingSection heading="What Outfiqe is">
      <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        <p>
          Outfiqe is an online fashion marketplace for Nepal. We don&apos;t make the clothes.
          Independent Nepali brands sell them here, and we handle the shopping, payment, delivery
          and support around each order.
        </p>
      </div>
    </MarketingSection>

    <MarketingSection heading="Who does what">
      <FeatureGrid items={roles} columns={2} />
      <p className="mt-6 max-w-2xl text-sm text-muted-foreground sm:text-base">
        New words? See{" "}
        <Link
          href="/help/glossary"
          className="font-medium text-foreground underline underline-offset-2"
        >
          what our words mean
        </Link>
        .
      </p>
    </MarketingSection>

    <MarketingSection heading="How it fits together">
      <ExampleCallout title="One kurta, three people">
        <p>
          A Kathmandu brand lists a kurta. Sita, a muse, wears it, posts a look and tags it. Maya
          sees the look, taps the tag and buys the kurta.
        </p>
        <p>
          Our rider collects it from the brand, we check it at our hub, and a delivery partner
          brings it to Maya. The brand earns from the sale, and Sita earns a commission.
        </p>
      </ExampleCallout>
    </MarketingSection>

    <MarketingSection heading="Why we started">
      <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        <p>
          Good clothes from Nepali brands were sold one Instagram drop at a time. Shoppers had no
          single place to browse them, no way to see how a piece fits before paying, and no reliable
          checkout or delivery. Brands ran customer service and couriers out of their DMs.
        </p>
        <p>
          Outfiqe fixes that end to end. Brands list once and hand ready orders to our riders. Muses
          drop the looks that show those clothes on real people. Shoppers add across brands to one
          cart, pay by cash on delivery or eSewa, and track one parcel to their door, with refunds
          handled for them if something goes wrong.
        </p>
      </div>
    </MarketingSection>

    <MarketingSection heading="What we believe">
      <FeatureGrid items={principles} columns={2} />
    </MarketingSection>

    <MarketingSection heading="How it works">
      <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
        A short walk through the shopper, muse and brand journeys lives on our{" "}
        <Link
          href="/how-it-works"
          className="font-medium text-foreground underline underline-offset-2"
        >
          How Outfiqe works
        </Link>{" "}
        page.
      </p>
    </MarketingSection>

    <MarketingCta
      title="Start with a look you like"
      body="Browse muse looks and shop the exact pieces, across every brand we carry."
      primary={{ href: "/shop", label: "Shop everything" }}
      secondary={{ href: "/explore", label: "Explore looks" }}
    />
  </MarketingShell>
);

export default AboutPage;
