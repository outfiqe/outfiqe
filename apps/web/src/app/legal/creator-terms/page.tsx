import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument, MarketingShell } from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Muse & affiliate terms",
  description:
    "The terms for Outfiqe muses: content standards, product tags, which sales earn a commission, when commissions are paid, and what isn't allowed.",
  path: "/legal/creator-terms",
});

const CreatorTermsPage = () => (
  <MarketingShell
    width="prose"
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Legal", path: "/legal/creator-terms" },
      { name: "Muse & affiliate terms", path: "/legal/creator-terms" },
    ]}
  >
    <LegalDocument
      title="Muse & affiliate terms"
      summary="These terms apply to approved Outfiqe muses, in addition to the general terms of service."
      lastReviewed="[NEEDS INPUT: effective date]"
      status="draft"
    >
      <h2>1. Becoming a muse</h2>
      <p>
        You apply from your dashboard, and our team reviews every application. We may suspend or
        remove muse status if you break these terms or the{" "}
        <Link href="/legal/community-guidelines">community guidelines</Link>. You must be at least{" "}
        <strong>[NEEDS INPUT: minimum age]</strong>.
      </p>

      <h2>2. Your looks and tags</h2>
      <ul>
        <li>
          Your looks must show real products that are on Outfiqe, worn or styled by you, or by
          others with their permission.
        </li>
        <li>
          You must own the photos you post, or have the right to use them, and everyone in them must
          agree to appear.
        </li>
        <li>
          Only tag the exact product you are wearing. Each brand reviews tags on its products before
          they go live, and may reject a tag or mark you as trusted.
        </li>
        <li>You must not post misleading, offensive, infringing or unlawful content.</li>
        <li>
          You allow Outfiqe to show, resize and promote your looks across the platform and in our
          marketing. You keep ownership of your photos.
        </li>
      </ul>

      <h2>3. Which sales earn a commission</h2>
      <ul>
        <li>
          A sale is yours when a shopper taps an approved tag on your look, or opens one of your
          share links, and then buys within 7 days. A link for one product only counts for that
          product. A general link counts for anything the shopper buys.
        </li>
        <li>If more than one muse qualifies, the most recent tap or link earns the commission.</li>
        <li>Buying through your own tag or link never earns a commission.</li>
        <li>
          Each commission is a fixed amount based on the price of the piece sold. Outfiqe may change
          these amounts, but a change never affects a commission already recorded. Your Earnings
          page shows the amount for every sale.
        </li>
      </ul>

      <h2>4. When commissions are paid</h2>
      <ul>
        <li>
          A commission is pending until the order is delivered and the 7-day return window has
          passed. It then becomes available to withdraw.
        </li>
        <li>
          If the order is cancelled, refunded or returned before the commission is paid out, the
          commission is removed.
        </li>
        <li>
          Withdrawals go to a verified bank account. An account is verified from your bank QR code
          or, if that doesn&apos;t match, by our team. The minimum amount, how often you can
          withdraw and the processing time are shown on your Withdraw page.
        </li>
        <li>
          Outfiqe may hold, reverse or remove commissions linked to fraud, manipulation or a breach
          of these terms.
        </li>
        <li>
          You are responsible for any tax on your earnings.{" "}
          <strong>[NEEDS INPUT: withholding-tax treatment and any documents required.]</strong>
        </li>
      </ul>

      <h2>5. What isn&apos;t allowed</h2>
      <ul>
        <li>Faking or inflating taps, clicks, sales, reviews or rankings in any way.</li>
        <li>Buying through your own account, or an account linked to you, to earn commission.</li>
        <li>Paid or fake engagement, or hiding that you were paid or gifted a product.</li>
        <li>Using Outfiqe&apos;s brand or another person&apos;s content without permission.</li>
      </ul>

      <h2>6. Your status</h2>
      <p>
        You take part as an independent person, not as an employee or agent of Outfiqe. These terms
        don&apos;t create a partnership or job.
      </p>

      <h2>7. Changes and ending the programme</h2>
      <p>
        Outfiqe may update these terms and commission amounts, and may end the muse programme or
        your place in it. Commissions that are already available at that point will still be paid,
        under the withdrawal rules.
      </p>
    </LegalDocument>
  </MarketingShell>
);

export default CreatorTermsPage;
