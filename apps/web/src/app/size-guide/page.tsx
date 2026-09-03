import type { Metadata } from "next";
import Link from "next/link";

import { MarketingHero, MarketingSection, MarketingShell } from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Size guide",
  description:
    "How sizing works on Outfiqe: sizes are set by each brand, every product lists the sizes it comes in, and creator looks show the fit on a real person so you can judge before you buy.",
  path: "/size-guide",
  keywords: ["clothing size guide Nepal", "how to find your size online", "Outfiqe sizing"],
});

const SizeGuidePage = () => (
  <MarketingShell
    width="prose"
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Size guide", path: "/size-guide" },
    ]}
  >
    <MarketingHero
      eyebrow="Size guide"
      title="Finding your size"
      lede="Every brand cuts its clothes a little differently. Here's how Outfiqe helps you get the fit right the first time."
    />

    <MarketingSection heading="Sizes come from the brand">
      <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        <p>
          Outfiqe doesn&apos;t impose one universal size chart. Each product lists the exact sizes
          that brand offers for that piece, and shows which are in stock. If a size is sold out, you
          can&apos;t add it, so there are no surprises at checkout.
        </p>
        <p>
          For traditional wear, tailoring and made-to-measure pieces, the product page tells you how
          the sizing is intended to work.
        </p>
      </div>
    </MarketingSection>

    <MarketingSection heading="Use the creator looks">
      <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        <p>
          The fastest way to judge fit is to look at the piece on a real person. Many creator looks
          note the size worn and the creator&apos;s height, so you can compare against your own
          frame instead of guessing from a flat photo.
        </p>
        <p>
          Open a product and check the <strong>Seen on creators</strong> section for looks featuring
          that exact piece.
        </p>
      </div>
    </MarketingSection>

    <MarketingSection heading="Still unsure?">
      <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
        If you&apos;re between sizes or a product page doesn&apos;t answer your question, reach us
        from the{" "}
        <Link href="/contact" className="font-medium text-foreground underline underline-offset-2">
          contact page
        </Link>{" "}
        before you order.
      </p>
    </MarketingSection>
  </MarketingShell>
);

export default SizeGuidePage;
