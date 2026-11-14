import type { Metadata } from "next";
import Link from "next/link";

import {
  ABOUT_ONE_JACKET_STORY,
  ABOUT_SHOPPING_BEFORE_OUTFIQE,
  ABOUT_TRUST_CHECKS,
  ABOUT_WHAT_EACH_SIDE_GETS,
  ABOUT_WHAT_MAKES_IT_DIFFERENT,
  ABOUT_WHAT_WE_LOOK_AFTER,
  ABOUT_WHO_IT_IS_FOR,
  FeatureGrid,
  MarketingCta,
  MarketingHero,
  MarketingSection,
  MarketingShell,
  StepList,
} from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "About Outfiqe",
  description:
    "Outfiqe is a fashion discovery platform. See what real people wear, get ideas for your next outfit, and buy the exact pieces from the brands that made them.",
  path: "/about",
  keywords: ["about Outfiqe", "fashion discovery platform", "shop the look", "Outfiqe muses"],
});

const PARAGRAPH_CLASS_NAME =
  "max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base";
const BULLET_LIST_CLASS_NAME =
  "max-w-2xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground sm:text-base";
const INLINE_LINK_CLASS_NAME = "font-medium text-foreground underline underline-offset-2";

const AboutPage = () => (
  <MarketingShell
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "About", path: "/about" },
    ]}
  >
    <MarketingHero
      eyebrow="About"
      title="Why we built Outfiqe"
      lede="Finding clothes you love shouldn't take ten social media pages, three DMs and a guess about your size. That's why we built Outfiqe."
    />

    <MarketingSection heading="The problem">
      <div className={PARAGRAPH_CLASS_NAME}>
        <p>
          There are a lot of good independent clothing brands out there. Some are small studios run
          by two or three people. Some are home businesses that started with one sewing machine.
          Most of them sell the same way: one drop at a time, on Instagram or Facebook.
        </p>
        <p>
          That works for the brand&apos;s existing followers. For everyone else, shopping looked
          something like this:
        </p>
      </div>
      <ul className={`mt-4 ${BULLET_LIST_CLASS_NAME}`}>
        {ABOUT_SHOPPING_BEFORE_OUTFIQE.map((frustration) => (
          <li key={frustration}>{frustration}</li>
        ))}
      </ul>
      <p className={`mt-4 ${PARAGRAPH_CLASS_NAME}`}>
        Shoppers were spread out. Brands were spread out. And it wasn&apos;t easy for brands either.
        Many of them were running sales, customer service, delivery and refunds from a phone, on top
        of actually making clothes.
      </p>
    </MarketingSection>

    <MarketingSection heading="What Outfiqe is">
      <div className={PARAGRAPH_CLASS_NAME}>
        <p>
          Outfiqe is a fashion discovery platform. It&apos;s one place where you can see what people
          are really wearing, get ideas for your next outfit, and buy the exact pieces from the
          brands that made them.
        </p>
        <p>
          We don&apos;t make the clothes, and we don&apos;t hold stock. Brands sell their own pieces
          at their own prices. We look after everything around the sale:
        </p>
      </div>
      <ul className={`mt-4 ${BULLET_LIST_CLASS_NAME}`}>
        {ABOUT_WHAT_WE_LOOK_AFTER.map((responsibility) => (
          <li key={responsibility}>{responsibility}</li>
        ))}
      </ul>
    </MarketingSection>

    <MarketingSection heading="Look first, then shop">
      <div className={PARAGRAPH_CLASS_NAME}>
        <p>
          Most online stores start with a search box. You have to know what you want before you can
          find it. Outfiqe starts with people instead.
        </p>
        <p>
          Real people, who we call muses, post photos of what they actually wear and tag every piece
          in the photo. You scroll through those looks, spot an outfit you like, tap the tag on the
          jacket, and you&apos;re on that exact jacket with its price, sizes and brand.
        </p>
        <p>
          You don&apos;t have to buy anything. Plenty of people open Outfiqe just to see what&apos;s
          trending this week and save a few ideas. When you&apos;re ready to buy, everything you
          saved is waiting for you.
        </p>
        <p>
          New to words like muse, look or hub? See{" "}
          <Link href="/help/glossary" className={INLINE_LINK_CLASS_NAME}>
            what our words mean
          </Link>
          .
        </p>
      </div>
    </MarketingSection>

    <MarketingSection heading="Who it's for">
      <FeatureGrid items={ABOUT_WHO_IT_IS_FOR} columns={3} />
    </MarketingSection>

    <MarketingSection heading="What makes it different">
      <FeatureGrid items={ABOUT_WHAT_MAKES_IT_DIFFERENT} columns={2} />
    </MarketingSection>

    <MarketingSection heading="What each side gets">
      <FeatureGrid items={ABOUT_WHAT_EACH_SIDE_GETS} columns={3} />
    </MarketingSection>

    <MarketingSection heading="How we keep it trustworthy">
      <p className={`mb-6 ${PARAGRAPH_CLASS_NAME}`}>
        A marketplace only works if people can trust what they see. So a few things always happen,
        no matter who you are.
      </p>
      <FeatureGrid items={ABOUT_TRUST_CHECKS} columns={3} />
    </MarketingSection>

    <MarketingSection heading="One jacket, three people">
      <p className={`mb-6 ${PARAGRAPH_CLASS_NAME}`}>
        The easiest way to understand Outfiqe is to follow a single piece of clothing. For each
        person&apos;s steps in more detail, see{" "}
        <Link href="/how-it-works" className={INLINE_LINK_CLASS_NAME}>
          how Outfiqe works
        </Link>
        .
      </p>
      <StepList steps={ABOUT_ONE_JACKET_STORY} />
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
