import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, MarketingShell } from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of service",
  description:
    "The terms that govern your use of Outfiqe as a shopper: your account, orders, payments, delivery, cancellations and acceptable use.",
  path: "/legal/terms",
});

const TermsPage = () => (
  <MarketingShell
    width="prose"
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Legal", path: "/legal/terms" },
      { name: "Terms of service", path: "/legal/terms" },
    ]}
  >
    <LegalDocument
      title="Terms of service"
      summary="These terms are a contract between you and Outfiqe covering how you may use the platform as a shopper. Separate terms apply to creators and to brands."
      lastReviewed="[NEEDS INPUT: effective date]"
      status="draft"
    >
      <h2>1. About these terms</h2>
      <p>
        Outfiqe is operated by <strong>[NEEDS INPUT: registered legal entity]</strong>. By creating
        an account or placing an order, you agree to these terms, the privacy policy, and the
        policies linked from them. If you do not agree, do not use Outfiqe.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must provide accurate information and keep your login secure.</li>
        <li>You must verify your email before checking out.</li>
        <li>
          You are responsible for activity under your account. Tell us immediately if you suspect
          unauthorised use.
        </li>
        <li>
          You must be at least <strong>[NEEDS INPUT: minimum age]</strong> to use Outfiqe.
        </li>
      </ul>

      <h2>3. Marketplace model</h2>
      <p>
        Products on Outfiqe are sold by independent Nepali brands. Outfiqe provides the storefront,
        checkout, fulfilment coordination and support. Product descriptions, images and stock are
        provided by the brand; Outfiqe reviews new listings but is not the manufacturer.
      </p>

      <h2>4. Orders and pricing</h2>
      <ul>
        <li>
          Prices are shown in Nepalese Rupees and include the price set by the brand. Delivery and
          any cash-on-delivery handling fee are added at checkout and shown before you pay.
        </li>
        <li>
          Placing an order is an offer to buy. An order is confirmed when payment is verified
          (wallet) or the order is placed (cash on delivery), subject to stock.
        </li>
        <li>
          If an item becomes unavailable after you order, we will cancel that item and refund or not
          charge you for it.
        </li>
        <li>We may limit or cancel orders that appear fraudulent or that breach these terms.</li>
      </ul>

      <h2>5. Payment</h2>
      <p>
        You can pay by cash on delivery, eSewa or Khalti. Wallet payments are processed by the
        provider; Outfiqe does not store your wallet credentials. See the{" "}
        <Link href="/legal/shipping-policy">shipping policy</Link> for delivery-fee details.
      </p>

      <h2>6. Delivery</h2>
      <p>
        Delivery times and fees depend on your delivery zone and are shown at checkout. Risk in the
        goods passes to you on delivery. See the shipping &amp; delivery policy.
      </p>

      <h2>7. Cancellations, returns and refunds</h2>
      <p>
        You may cancel an order yourself while it has not yet shipped. Once shipped, contact us.
        Returns, refund eligibility and timelines are set out in the{" "}
        <Link href="/legal/returns-policy">return &amp; refund policy</Link>.
      </p>

      <h2>8. Content and reviews</h2>
      <p>
        You may only review products you have received. You are responsible for content you post,
        which must follow the <Link href="/legal/community-guidelines">community guidelines</Link>.
        You grant Outfiqe a licence to display content you post on the platform.
      </p>

      <h2>9. Acceptable use</h2>
      <ul>
        <li>
          Do not misuse the platform, interfere with its operation, or attempt to access data that
          is not yours.
        </li>
        <li>Do not scrape, resell or misrepresent the service.</li>
        <li>Do not attempt to manipulate creator attribution, commissions, reviews or rankings.</li>
      </ul>

      <h2>10. Liability</h2>
      <p>
        Outfiqe provides the platform &ldquo;as is&rdquo;. To the extent permitted by law, Outfiqe
        is not liable for indirect or consequential loss. Nothing in these terms limits liability
        that cannot be limited by law.{" "}
        <strong>
          [NEEDS INPUT: liability cap and consumer-law carve-outs, confirmed with counsel.]
        </strong>
      </p>

      <h2>11. Suspension and termination</h2>
      <p>
        We may suspend or close an account that breaches these terms or the law. You may close your
        account at any time from your settings.
      </p>

      <h2>12. Changes and governing law</h2>
      <p>
        We may update these terms and will post the new version here. These terms are governed by
        the laws of Nepal, and disputes are subject to{" "}
        <strong>[NEEDS INPUT: courts / dispute-resolution venue]</strong>.
      </p>
    </LegalDocument>
  </MarketingShell>
);

export default TermsPage;
