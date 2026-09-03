import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, MarketingShell } from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Return & refund policy",
  description:
    "When you can cancel, return or get a refund on an Outfiqe order. The timelines, the conditions, and how refunds are paid.",
  path: "/legal/returns-policy",
  keywords: ["Outfiqe returns", "fashion refund policy Nepal", "cancel order Outfiqe"],
});

const ReturnsPolicyPage = () => (
  <MarketingShell
    width="prose"
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Legal", path: "/legal/returns-policy" },
      { name: "Return & refund policy", path: "/legal/returns-policy" },
    ]}
  >
    <LegalDocument
      title="Return & refund policy"
      summary="This policy sets out your cancellation and return rights, and how Outfiqe handles refunds."
      lastReviewed="[NEEDS INPUT: effective date]"
      status="draft"
    >
      <h2>Cancelling before dispatch</h2>
      <p>
        You can cancel an order yourself, free of charge, while it is still marked{" "}
        <strong>placed</strong> or <strong>packed</strong>. Do this from Your orders. Once the order
        is marked shipped, it can no longer be cancelled from your account. Contact us instead.
      </p>

      <h2>Returns after delivery</h2>
      <p>
        <strong>
          [NEEDS INPUT: the return window (for example, X days from delivery), which items are
          eligible, condition requirements (unworn, tags attached, original packaging), and any
          non-returnable categories such as innerwear or final-sale items.]
        </strong>
      </p>
      <ul>
        <li>
          Wrong item, missing item, or an item that arrived damaged or faulty: contact us within{" "}
          <strong>[NEEDS INPUT: number]</strong> days of delivery with photos. We&apos;ll arrange a
          replacement or full refund at no cost to you.
        </li>
        <li>
          Change of mind:{" "}
          <strong>[NEEDS INPUT: whether this is accepted, and who pays return delivery.]</strong>
        </li>
      </ul>

      <h2>How to start a return</h2>
      <ol>
        <li>
          Contact us from the <Link href="/contact">contact page</Link> with your order number and
          the reason.
        </li>
        <li>We&apos;ll confirm whether the item is eligible and how to send it back.</li>
        <li>Once we receive and check the item, we process your refund.</li>
      </ol>

      <h2>Refunds</h2>
      <ul>
        <li>
          Wallet payments (eSewa, Khalti): refunded to the original wallet where the provider
          supports it, otherwise handled directly.
        </li>
        <li>Cash on delivery: refunded by an agreed method, since no online payment was taken.</li>
        <li>
          Delivery fees are refunded when the return is due to our or the brand&apos;s error, and
          otherwise{" "}
          <strong>
            [NEEDS INPUT: state whether delivery fees are refundable on change-of-mind returns.]
          </strong>
        </li>
        <li>
          Processing time:{" "}
          <strong>[NEEDS INPUT: expected number of days once the return is approved.]</strong>
        </li>
      </ul>

      <h2>Items sold by brands</h2>
      <p>
        Products are sold by independent brands. Outfiqe coordinates returns and refunds on your
        behalf and is your point of contact. You do not need to deal with the brand directly.
      </p>

      <h2>Your statutory rights</h2>
      <p>
        This policy is in addition to any rights you have under applicable consumer-protection law
        in Nepal, which are not affected.{" "}
        <strong>[NEEDS INPUT: confirm consumer-law references.]</strong>
      </p>
    </LegalDocument>
  </MarketingShell>
);

export default ReturnsPolicyPage;
