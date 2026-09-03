import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, MarketingShell } from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Creator & affiliate terms",
  description:
    "The terms for Outfiqe creators: content standards, how attribution and commissions work, payout conditions, and prohibited conduct.",
  path: "/legal/creator-terms",
});

const CreatorTermsPage = () => (
  <MarketingShell
    width="prose"
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Legal", path: "/legal/creator-terms" },
      { name: "Creator & affiliate terms", path: "/legal/creator-terms" },
    ]}
  >
    <LegalDocument
      title="Creator & affiliate terms"
      summary="These terms apply to approved Outfiqe creators, in addition to the general terms of service."
      lastReviewed="[NEEDS INPUT: effective date]"
      status="draft"
    >
      <h2>1. Becoming a creator</h2>
      <p>
        Creator status is granted after review and can be suspended or removed for breach of these
        terms or the <Link href="/legal/community-guidelines">community guidelines</Link>. You must
        be at least <strong>[NEEDS INPUT: minimum age]</strong>.
      </p>

      <h2>2. Your content</h2>
      <ul>
        <li>
          Looks must feature real products available on Outfiqe, worn or styled by you or with
          permission.
        </li>
        <li>
          You must own or have the rights to the photos you post and any people shown must consent.
        </li>
        <li>You must not post misleading, offensive, infringing or unlawful content.</li>
        <li>
          You grant Outfiqe a non-exclusive licence to display, resize and promote your looks across
          the platform and its marketing.
        </li>
      </ul>

      <h2>3. Attribution and commissions</h2>
      <ul>
        <li>
          A sale is attributed to you when a shopper taps a product you tagged, or opens your
          shareable link, and buys that product within the attribution window of 7 days. The most
          recent qualifying action is credited.
        </li>
        <li>Self-referrals, where you are the buyer, are never attributed.</li>
        <li>
          Commission rates are set by Outfiqe&apos;s commission structure and may change. The rate
          recorded on each sale is shown in your earnings dashboard.
        </li>
        <li>
          A commission is pending until the order is delivered and clears the return window, then
          becomes available. Cancelled, failed or refunded orders do not earn commission.
        </li>
        <li>
          Outfiqe may withhold, reverse or void commissions linked to fraud, manipulation, returns
          or policy breach.
        </li>
      </ul>

      <h2>4. Payouts</h2>
      <ul>
        <li>Your available balance is the sum of your available commissions.</li>
        <li>
          Withdrawals are made to a bank account you have verified, subject to the minimum amount,
          request window and other conditions in the withdrawal policy.
        </li>
        <li>
          You are responsible for any taxes on your earnings.{" "}
          <strong>[NEEDS INPUT: withholding-tax treatment and any documentation required.]</strong>
        </li>
      </ul>

      <h2>5. Prohibited conduct</h2>
      <ul>
        <li>Manipulating clicks, attribution, reviews or rankings by any means.</li>
        <li>Buying through your own or a connected account to generate commission.</li>
        <li>Incentivised or fake engagement, or misrepresenting a paid relationship.</li>
        <li>Using Outfiqe assets or another person&apos;s content without permission.</li>
      </ul>

      <h2>6. Independent status</h2>
      <p>
        You are an independent participant, not an employee or agent of Outfiqe. Nothing here
        creates a partnership or employment relationship.
      </p>

      <h2>7. Changes and termination</h2>
      <p>
        Outfiqe may update these terms and the commission structure, and may end the creator
        programme or your participation in it. Commissions already available at that point remain
        payable subject to the withdrawal policy.
      </p>
    </LegalDocument>
  </MarketingShell>
);

export default CreatorTermsPage;
