import type { Metadata } from "next";
import Link from "next/link";

import { MarketingHero, MarketingSection, MarketingShell } from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Size guide",
  description:
    "How sizing works on Outfiqe: each brand sets its own sizes, every product shows which sizes are in stock, and muse looks and verified reviews help you judge the fit before you buy.",
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
      lede="Every brand cuts its clothes a little differently. Here's how to get the fit right the first time."
    />

    <MarketingSection heading="Sizes come from the brand">
      <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        <p>
          There is no single size chart on Outfiqe. Each brand uses its own sizes, so an M from one
          brand may fit differently from an M from another. Every product shows the sizes it comes
          in and which ones are in stock. A sold-out size can&apos;t be added to your cart.
        </p>
        <p>
          Thrift pieces are usually one of a kind, so they come in a single size. Read the condition
          note on the product page for any details about fit or wear.
        </p>
      </div>
    </MarketingSection>

    <MarketingSection heading="See it on a real person">
      <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        <p>
          The easiest way to judge fit is to see the piece being worn. Open a product and scroll to
          the <strong>Seen on muses</strong> section to find looks featuring that exact piece. Many
          tags show the size the muse is wearing and how tall they are, so you can compare with your
          own height.
        </p>
        <p>
          Reviews help too. Only people who received the product can review it, and many mention how
          it fits.
        </p>
      </div>
    </MarketingSection>

    <MarketingSection heading="Still unsure?">
      <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
        If you&apos;re between sizes, or the product page doesn&apos;t answer your question,{" "}
        <Link href="/support" className="font-medium text-foreground underline underline-offset-2">
          raise a support request
        </Link>{" "}
        before you order and we&apos;ll help you choose.
      </p>
    </MarketingSection>
  </MarketingShell>
);

export default SizeGuidePage;
