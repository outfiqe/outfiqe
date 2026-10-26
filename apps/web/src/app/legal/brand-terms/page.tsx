import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, MarketingShell } from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Seller terms",
  description:
    "The terms for brands selling on Outfiqe: listings, commission, order pickup and delivery, returns, payouts, and when we may suspend a brand.",
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
      summary="These terms cover the relationship between Outfiqe and a brand selling on the platform, in addition to any signed agreement."
      lastReviewed="[NEEDS INPUT: effective date]"
      status="draft"
    >
      <h2>1. Joining Outfiqe</h2>
      <p>
        Brands apply through our application form, and our team reviews every application. Once
        approved, you receive an email link to create your brand account. Outfiqe may decline a
        brand, or remove one later, for breaking these terms, repeated order problems, or risk to
        our reputation.{" "}
        <strong>
          [NEEDS INPUT: whether a signed agreement is required, and which document takes priority.]
        </strong>
      </p>

      <h2>2. Listings</h2>
      <ul>
        <li>You are responsible for accurate product details, photos, prices, sizes and stock.</li>
        <li>
          Our team reviews each new product before it goes live. You can edit, restock, discount or
          remove a live product yourself at any time.
        </li>
        <li>
          Products must be genuine, legal to sell and yours to sell. No counterfeit or infringing
          goods.
        </li>
        <li>If you list a secondhand piece as Thrift, you must describe its condition honestly.</li>
        <li>Keep stock up to date so shoppers can&apos;t buy items you don&apos;t have.</li>
      </ul>

      <h2>3. Commission and fees</h2>
      <ul>
        <li>
          Listing is free. Outfiqe takes a commission on each completed sale, based on the price of
          the piece and the commission rates in effect when the order is placed. A later change in
          rates never affects a past sale.
        </li>
        <li>
          Outfiqe covers eSewa and Khalti payment fees. They are not deducted from your earnings.
        </li>
        <li>
          Muse commissions are paid by Outfiqe and are not deducted from your earnings. Discounts
          from Outfiqe coupons are also paid by Outfiqe. Sale prices you set yourself lower the
          amount of the sale.
        </li>
        <li>
          <strong>
            [NEEDS INPUT: publish the current commission rates and any exemption terms.]
          </strong>
        </li>
      </ul>

      <h2>4. Orders, pickup and delivery</h2>
      <ul>
        <li>
          Prepare confirmed orders promptly, to the quality shown in your listing, and pack each one
          with its pickup slip.
        </li>
        <li>
          In most areas, an Outfiqe rider collects ready orders from your pickup location. We check
          each item at our hub and arrange delivery. For these orders, we don&apos;t share the
          customer&apos;s contact or address details with you, because you don&apos;t need them.
        </li>
        <li>
          Where an order must be sent by you, your Orders page says so. You then ship it and update
          its status, including tracking details.
        </li>
        <li>
          If you can&apos;t supply an item, report it from the order straight away so the shopper is
          refunded quickly.
        </li>
        <li>
          We keep a record of pickup and quality problems, such as orders not ready for collection
          or items failing our check, and show it in your dashboard.
        </li>
      </ul>

      <h2>5. Cancellations, returns and refunds</h2>
      <p>
        Outfiqe handles cancellations, returns and refunds with shoppers under its{" "}
        <Link href="/legal/returns-policy">return &amp; refund policy</Link>. Items that fail our
        quality check, or that a shopper refuses at delivery, are brought back to you by our rider.
        You confirm them in your dashboard, and the stock goes back on sale. When an item is
        refunded, your earnings for it are removed. If you have already withdrawn them, we may
        recover the amount.{" "}
        <strong>[NEEDS INPUT: how amounts are recovered, and the dispute process.]</strong>
      </p>

      <h2>6. Earnings and payouts</h2>
      <ul>
        <li>Each completed sale adds its price, less Outfiqe&apos;s commission, to your wallet.</li>
        <li>Earnings become available to withdraw 7 days after the order is delivered.</li>
        <li>
          Withdrawals go to a verified brand bank account. The minimum and maximum amounts, how
          often you can withdraw, and any extra approval for large amounts are shown in your wallet.
        </li>
        <li>
          You are responsible for your own taxes, including invoicing and VAT.{" "}
          <strong>[NEEDS INPUT: tax and invoicing responsibilities.]</strong>
        </li>
      </ul>

      <h2>7. Your brand, content and muse tags</h2>
      <p>
        You allow Outfiqe to use your brand name, logo, product photos and descriptions to run and
        promote the marketplace. Muses may feature your products in their looks. You review the tags
        on your products and should approve or reject them promptly and fairly.
      </p>

      <h2>8. Suspension and ending the relationship</h2>
      <p>
        Outfiqe may pause your listings or hold a payout if we suspect fraud, after a serious order
        problem, or because of a legal issue, until it is resolved. Either side may end the
        relationship with notice. Money properly owed to you will still be paid.
      </p>

      <h2>9. Responsibility for your products</h2>
      <p>
        You are responsible for your products and for making sure they follow the law. You agree to
        cover Outfiqe against claims that arise from them.{" "}
        <strong>[NEEDS INPUT: liability limits and insurance requirements.]</strong>
      </p>
    </LegalDocument>
  </MarketingShell>
);

export default BrandTermsPage;
