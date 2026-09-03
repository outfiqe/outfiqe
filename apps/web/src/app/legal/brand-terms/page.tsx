import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, MarketingShell } from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Seller terms",
  description:
    "The terms for brands selling on Outfiqe: listing standards, commissions and fees, fulfilment obligations, settlements and payouts, and grounds for suspension.",
  path: "/legal/brand-terms",
});

const BrandTermsPage = () => (
  <MarketingShell
    width="prose"
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Legal", path: "/legal/brand-terms" },
      { name: "Seller terms", path: "/legal/brand-terms" },
    ]}
  >
    <LegalDocument
      title="Seller terms"
      summary="These terms govern the relationship between Outfiqe and a brand selling on the platform, in addition to any signed agreement."
      lastReviewed="[NEEDS INPUT: effective date]"
      status="draft"
    >
      <h2>1. Onboarding</h2>
      <p>
        A brand is admitted after an application review. Outfiqe may decline or later remove a brand
        for breach of these terms, poor fulfilment, or reputational risk. Each brand designates an
        owner account and may add staff.{" "}
        <strong>
          [NEEDS INPUT: whether a signed master agreement is required and its precedence.]
        </strong>
      </p>

      <h2>2. Listings</h2>
      <ul>
        <li>
          You are responsible for the accuracy of product information, images, pricing, sizing and
          stock.
        </li>
        <li>
          New listings are reviewed before they publish. You may edit, restock or remove a live
          listing yourself.
        </li>
        <li>
          Products must be lawful to sell, genuine, and yours to sell. No counterfeits or infringing
          goods.
        </li>
        <li>You must maintain accurate stock so shoppers are not sold items you cannot fulfil.</li>
      </ul>

      <h2>3. Commissions and fees</h2>
      <ul>
        <li>
          Listing is free. Outfiqe charges a commission on each completed sale, calculated using the
          platform commission structure in effect at the time of the sale.
        </li>
        <li>
          Payment-gateway fees on wallet payments are passed through. Cash-on-delivery has no
          gateway fee.
        </li>
        <li>
          A portion of Outfiqe&apos;s commission funds the creator who sourced an attributed sale.
        </li>
        <li>
          The rate applied to each sale is recorded and does not change retroactively if the
          structure is later updated.
        </li>
        <li>
          <strong>
            [NEEDS INPUT: publish the current commission tiers, any gateway-fee rates, and any
            exemption terms.]
          </strong>
        </li>
      </ul>

      <h2>4. Orders and fulfilment</h2>
      <ul>
        <li>
          You must prepare confirmed orders promptly and to the quality shown in your listing.
        </li>
        <li>
          Outfiqe coordinates delivery. Buyer contact and address details are provided only as
          needed for fulfilment.
        </li>
        <li>Fulfilment-status changes and post-shipment cancellations are managed by Outfiqe.</li>
      </ul>

      <h2>5. Cancellations, returns and refunds</h2>
      <p>
        Outfiqe handles buyer-facing cancellations and returns under its{" "}
        <Link href="/legal/returns-policy">return &amp; refund policy</Link>. Where a return is due
        to a brand error (wrong, damaged or misdescribed item), the associated commission and any
        refunded amounts are adjusted against your settlement.{" "}
        <strong>[NEEDS INPUT: chargeback / clawback mechanics and dispute process.]</strong>
      </p>

      <h2>6. Settlements and payouts</h2>
      <ul>
        <li>
          Each completed sale adds a payable amount (gross, less Outfiqe&apos;s commission and any
          gateway fee) to your settlement balance.
        </li>
        <li>Balances become available for withdrawal once the associated orders clear.</li>
        <li>
          Withdrawals are made to a verified brand bank account, subject to the business withdrawal
          policy, including its limits and any second-approval requirement for large amounts.
        </li>
        <li>
          You are responsible for your own tax obligations, including any invoicing and VAT.{" "}
          <strong>[NEEDS INPUT: tax and invoicing responsibilities.]</strong>
        </li>
      </ul>

      <h2>7. Brand content and marks</h2>
      <p>
        You grant Outfiqe a licence to use your name, logo, product images and descriptions to
        operate and market the marketplace. Creators may feature your products in looks.
      </p>

      <h2>8. Suspension and termination</h2>
      <p>
        Outfiqe may suspend listings or withhold a settlement where there is suspected fraud, a
        serious fulfilment failure, or a legal issue, pending resolution. Either party may end the
        relationship on notice; amounts properly owed to you remain payable.
      </p>

      <h2>9. Liability and indemnity</h2>
      <p>
        You are responsible for your products and their compliance with law, and you indemnify
        Outfiqe against claims arising from them.{" "}
        <strong>[NEEDS INPUT: liability caps and insurance requirements.]</strong>
      </p>
    </LegalDocument>
  </MarketingShell>
);

export default BrandTermsPage;
