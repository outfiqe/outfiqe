import type { Metadata } from "next";

import {
  GLOSSARY_GROUPS,
  GlossaryList,
  MarketingCta,
  MarketingHero,
  MarketingSection,
  MarketingShell,
} from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "What our words mean",
  description:
    "Plain meanings for the words used on Outfiqe: muse, brand, look, tag, Thrift, hub, commission and more, with examples.",
  path: "/help/glossary",
  keywords: ["what is a muse", "Outfiqe glossary", "Outfiqe meaning"],
});

const GlossaryPage = () => (
  <MarketingShell
    width="prose"
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Help centre", path: "/help" },
      { name: "What our words mean", path: "/help/glossary" },
    ]}
  >
    <MarketingHero
      eyebrow="Help centre"
      title="What our words mean"
      lede="New to Outfiqe? Here's what each word means, in plain language."
    />

    {GLOSSARY_GROUPS.map(({ heading, terms }) => (
      <MarketingSection key={heading} heading={heading}>
        <GlossaryList terms={terms} />
      </MarketingSection>
    ))}

    <MarketingCta
      title="Still have a question?"
      body="The help centre answers the most common ones, and our team is here for the rest."
      primary={{ href: "/help", label: "Go to the help centre" }}
      secondary={{ href: "/contact", label: "Contact us" }}
    />
  </MarketingShell>
);

export default GlossaryPage;
