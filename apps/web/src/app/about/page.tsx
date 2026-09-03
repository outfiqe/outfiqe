import type { Metadata } from "next";
import Link from "next/link";

import {
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
    "Outfiqe is a Nepali fashion marketplace. Local brands, shown in creator looks so you can see the fit before you buy. What we are building, and why.",
  path: "/about",
  keywords: ["about Outfiqe", "Nepali fashion marketplace", "Outfiqe company"],
});

const principles = [
  {
    title: "Local brands first",
    body: "Every brand on Outfiqe is a Nepali label. We help small studios reach shoppers they could never reach alone, and we only earn when they sell.",
  },
  {
    title: "See the fit before you buy",
    body: "A photo on a hanger tells you almost nothing about how a piece wears. Every product on Outfiqe comes with a creator look, so you can judge the fit and the drape first.",
  },
  {
    title: "One cart, built for Nepal",
    body: "Shop across brands in a single checkout. Pay cash on delivery or by wallet. It arrives at your door. No juggling five Instagram DMs.",
  },
  {
    title: "Creators earn for taste",
    body: "The people who style and post the looks that sell a piece earn a commission on it. Discovery and income run on the same rail.",
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
      lede="Outfiqe brings Nepal's clothing brands together in one storefront and pairs each one with creator looks. Shopping starts with an outfit you like, not a search box."
    />

    <MarketingSection heading="Why we started">
      <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        <p>
          Good clothes from Nepali brands were being sold one Instagram post at a time. Shoppers had
          no single place to browse them, no way to see how a piece actually fits before paying, and
          no reliable checkout. Brands were stuck running customer service out of their DMs.
        </p>
        <p>
          Outfiqe fixes the storefront. Brands list their catalogue once. Creators post the looks
          that show those clothes on real people. Shoppers browse by taste, add across brands to one
          cart, and check out with cash on delivery or a wallet.
        </p>
      </div>
    </MarketingSection>

    <MarketingSection heading="What we believe">
      <FeatureGrid items={principles} columns={2} />
    </MarketingSection>

    <MarketingSection heading="How it works">
      <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
        A short walk through the shopper, creator and brand journeys lives on our{" "}
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
      body="Browse creator looks and shop the exact pieces, across every brand we carry."
      primary={{ href: "/shop", label: "Shop everything" }}
      secondary={{ href: "/explore", label: "Explore looks" }}
    />
  </MarketingShell>
);

export default AboutPage;
