import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, MarketingShell } from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Shipping & delivery policy",
  description:
    "How Outfiqe delivers orders across Nepal: delivery zones and fees, free delivery, cash on delivery, tracking, one-parcel delivery, and what happens if a delivery goes wrong.",
  path: "/legal/shipping-policy",
  keywords: ["Outfiqe delivery", "shipping fashion Nepal", "cash on delivery Nepal"],
});

const ShippingPolicyPage = () => (
  <MarketingShell
    width="prose"
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Legal", path: "/legal/shipping-policy" },
      { name: "Shipping & delivery policy", path: "/legal/shipping-policy" },
    ]}
  >
    <LegalDocument
      title="Shipping & delivery policy"
      summary="Where Outfiqe delivers, what delivery costs, how your order reaches you, and what happens if something goes wrong."
      lastReviewed="[NEEDS INPUT: effective date]"
      status="draft"
    >
      <h2>Where we deliver</h2>
      <p>
        Outfiqe delivers within Nepal. Our delivery area is split into zones, and each city belongs
        to a zone. When you enter your city in your cart or at checkout, we show the delivery fee
        and expected delivery dates for your zone.
      </p>

      <h2>Delivery fees</h2>
      <ul>
        <li>Each zone has its own delivery fee, which is charged once per order.</li>
        <li>Each zone also has a free-delivery threshold. Orders at or above it ship free.</li>
        <li>Cash-on-delivery orders add a small handling fee, which is also set per zone.</li>
        <li>You always see every fee before you place your order.</li>
        <li>
          <strong>
            [NEEDS INPUT: publish the current fee table per zone, the free-delivery thresholds, and
            the cash-on-delivery handling fee.]
          </strong>
        </li>
      </ul>

      <h2>How your order reaches you</h2>
      <p>
        For most brands, an Outfiqe rider collects your items from the brand. We check every piece
        at our hub, pack your whole order into one parcel, and hand it to a delivery partner who
        brings it to your door. Some brands still send their part of the order themselves. Where
        that happens, your order page shows it as a separate delivery.
      </p>

      <h2>Delivery times and tracking</h2>
      <p>
        Delivery time depends on your zone. The expected dates are shown at checkout and on your
        order page. They are estimates, not guaranteed dates. Your order page shows each step, such
        as &quot;Your items reached our hub&quot; and &quot;Your order is out for delivery&quot;,
        and links to the delivery partner&apos;s own tracking page.
      </p>

      <h2>Failed or refused delivery</h2>
      <ul>
        <li>
          Please keep your phone switched on. The delivery partner will call you to arrange the
          handover. If a delivery attempt fails, they will try again.
        </li>
        <li>
          If you refuse a cash-on-delivery parcel, you pay nothing, including the delivery and
          handling fees. After 2 refused deliveries within a year, cash on delivery is no longer
          offered on that account or phone number, but you can still pay online.
        </li>
        <li>
          If the delivery partner loses or damages your parcel, we refund you in full, including the
          fees.
        </li>
      </ul>

      <h2>If your order says delivered but you don&apos;t have it</h2>
      <p>
        Open the order and tap &quot;I didn&apos;t receive this&quot; on the parcel within 3 days of
        delivery. Our team will look into it with the delivery partner. For any other delivery
        problem, <Link href="/support">raise a support request</Link>.
      </p>

      <h2>Checking your order</h2>
      <p>
        Please check your order when it arrives and tell us promptly about anything damaged, missing
        or wrong. See the <Link href="/legal/returns-policy">return &amp; refund policy</Link> for
        what happens next.
      </p>
    </LegalDocument>
  </MarketingShell>
);

export default ShippingPolicyPage;
