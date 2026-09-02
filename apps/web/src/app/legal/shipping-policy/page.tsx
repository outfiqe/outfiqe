import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, MarketingShell } from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Shipping & delivery policy",
  description:
    "How Outfiqe delivers orders across Nepal: delivery zones, fees, free-delivery thresholds, cash-on-delivery handling, timelines and what happens if something goes wrong.",
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
      summary="How and where Outfiqe delivers, what delivery costs, and how long it takes."
      lastReviewed="[NEEDS INPUT: effective date]"
      status="draft"
    >
      <h2>Where we deliver</h2>
      <p>
        Outfiqe delivers within Nepal. Coverage is organised into delivery zones. Your
        address&apos;s zone — and whether we currently deliver there — is confirmed at checkout.
      </p>

      <h2>Delivery fees</h2>
      <ul>
        <li>
          A flat delivery fee applies per order, set by your delivery zone and shown before you pay.
        </li>
        <li>
          Orders at or above the free-delivery threshold for your zone ship with no delivery fee.
        </li>
        <li>Cash-on-delivery orders add a small handling fee per order.</li>
        <li>
          <strong>
            [NEEDS INPUT: publish the current fee table per zone, the free-delivery thresholds, and
            the COD handling fee.]
          </strong>
        </li>
      </ul>

      <h2>Timelines</h2>
      <p>
        Delivery time depends on your zone. Kathmandu Valley is typically fastest; other regions
        take longer. Estimates are shown at checkout and are not guaranteed dates.{" "}
        <strong>[NEEDS INPUT: typical delivery windows per zone.]</strong>
      </p>

      <h2>Multi-brand orders</h2>
      <p>
        An order can contain items from more than one brand. Items may be prepared by different
        brands and can arrive separately; you are charged one delivery fee per order.
      </p>

      <h2>Failed or delayed delivery</h2>
      <ul>
        <li>
          Keep your phone reachable — our delivery partner will contact you to arrange handover.
        </li>
        <li>
          If delivery cannot be completed after reasonable attempts, the order may be returned to us
          and treated as a cancellation.
        </li>
        <li>
          If your order is significantly delayed, contact us from the{" "}
          <Link href="/contact">contact page</Link>.
        </li>
      </ul>

      <h2>Risk and inspection</h2>
      <p>
        Risk in the goods passes to you on delivery. Check your order on receipt and report any
        damage or wrong item promptly — see the{" "}
        <Link href="/legal/returns-policy">return &amp; refund policy</Link>.
      </p>
    </LegalDocument>
  </MarketingShell>
);

export default ShippingPolicyPage;
