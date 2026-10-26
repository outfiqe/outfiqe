import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, MarketingShell } from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Return & refund policy",
  description:
    "When you can cancel, return or get a refund on an Outfiqe order, and how the money comes back to you for cash on delivery, eSewa and Khalti.",
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
      summary="This policy explains when you can cancel or return an order, and how Outfiqe refunds you."
      lastReviewed="[NEEDS INPUT: effective date]"
      status="draft"
    >
      <h2>Cancelling an order</h2>
      <p>
        You can cancel your order free of charge before it ships. Open the order in Your orders. If
        you see <strong>Cancel items</strong>, you can cancel some pieces or the whole order while
        the brand still has them. If you don&apos;t see it, or your items have already left the
        brand, please <Link href="/support">raise a support request</Link> and we&apos;ll help.
      </p>

      <h2>When we refund you automatically</h2>
      <p>You don&apos;t need to ask for a refund when:</p>
      <ul>
        <li>you cancel pieces from your order;</li>
        <li>a brand can&apos;t supply an item you ordered;</li>
        <li>a piece fails our quality check at the hub;</li>
        <li>
          the delivery partner loses or damages your parcel. In this case, the delivery and handling
          fees are refunded too.
        </li>
      </ul>
      <p>
        Your order page lists every refund, the reason for it, and how the money is coming back to
        you.
      </p>

      <h2>Returns after delivery</h2>
      <p>
        If an item arrives damaged, faulty, wrong or missing, please{" "}
        <Link href="/support">raise a support request</Link> within <strong>7 days</strong> of
        delivery, with your order number and photos. We&apos;ll arrange a replacement or a full
        refund at no cost to you.
      </p>
      <ul>
        <li>
          Change of mind:{" "}
          <strong>
            [NEEDS INPUT: whether change-of-mind returns are accepted, the condition items must be
            in (unworn, tags attached), any items that can&apos;t be returned, and who pays for
            return delivery.]
          </strong>
        </li>
        <li>
          Thrift pieces are secondhand. Their condition is described on the product page, and you
          confirm it before buying.
        </li>
      </ul>

      <h2>How refunds are paid</h2>
      <ul>
        <li>
          <strong>Khalti:</strong> the money goes straight back to your Khalti account.
        </li>
        <li>
          <strong>Cash on delivery:</strong> if you haven&apos;t paid yet, the refunded amount is
          simply taken off what you pay the rider.
        </li>
        <li>
          <strong>eSewa and other cases:</strong> we&apos;ll ask you to add a refund account (eSewa,
          Khalti or bank) on your order page, by email and in your notifications. Once you add it,
          our team sends the money and lets you know.
        </li>
        <li>
          Processing time:{" "}
          <strong>[NEEDS INPUT: expected number of days once a refund is approved.]</strong>
        </li>
      </ul>

      <h2>Items sold by brands</h2>
      <p>
        Products are sold by independent brands, but Outfiqe handles cancellations, returns and
        refunds for you. You don&apos;t need to contact the brand directly.
      </p>

      <h2>Your legal rights</h2>
      <p>
        This policy does not affect any rights you have under consumer protection law in Nepal.{" "}
        <strong>[NEEDS INPUT: confirm consumer-law references.]</strong>
      </p>
    </LegalDocument>
  </MarketingShell>
);

export default ReturnsPolicyPage;
