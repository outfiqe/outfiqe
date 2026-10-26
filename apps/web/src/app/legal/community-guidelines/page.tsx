import type { Metadata } from "next";

import { LegalDocument, MarketingShell } from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Community guidelines",
  description:
    "The standards for content and behaviour on Outfiqe, for muses dropping looks, shoppers writing reviews, and everyone using chat.",
  path: "/legal/community-guidelines",
});

const CommunityGuidelinesPage = () => (
  <MarketingShell
    width="prose"
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Legal", path: "/legal/community-guidelines" },
      { name: "Community guidelines", path: "/legal/community-guidelines" },
    ]}
  >
    <LegalDocument
      title="Community guidelines"
      summary="Outfiqe is a place to discover and sell fashion. These guidelines keep it useful, honest and safe."
      lastReviewed="[NEEDS INPUT: effective date]"
      status="draft"
    >
      <h2>Post real, honest content</h2>
      <ul>
        <li>Looks should show real products, worn or styled honestly.</li>
        <li>Only tag the exact product shown in your look.</li>
        <li>
          Reviews should describe your own experience. Only people who received a product can review
          it.
        </li>
        <li>Be open about it when a product was paid for or gifted.</li>
      </ul>

      <h2>Respect people</h2>
      <ul>
        <li>No harassment, hate speech, threats or bullying.</li>
        <li>No sharing of someone else&apos;s private information.</li>
        <li>Anyone shown in your photos must have agreed to appear.</li>
      </ul>

      <h2>Keep it lawful and appropriate</h2>
      <ul>
        <li>No sexual content involving minors, and no non-consensual or exploitative content.</li>
        <li>No content that infringes copyright, trademarks or other rights.</li>
        <li>No promotion of illegal goods, services or activity.</li>
        <li>No spam, scams or attempts to move transactions off Outfiqe.</li>
      </ul>

      <h2>Don&apos;t game the system</h2>
      <ul>
        <li>No fake reviews, fake engagement, or coordinated manipulation of rankings.</li>
        <li>No manipulating muse attribution or commissions.</li>
        <li>No multiple accounts to evade limits or bans.</li>
      </ul>

      <h2>Chat</h2>
      <p>
        Messages are for conversations between shoppers, muses and brands, and the same standards
        apply. You can block someone, or turn chat off completely, from your chat settings.
      </p>

      <h2>Enforcement</h2>
      <p>
        We may remove content, limit features, or suspend or close accounts that break these
        guidelines. Serious or repeated breaches lead to a permanent ban. To report a look, a
        comment or a wrong product tag, use the report option on it. For anything else, raise a
        support request.
      </p>
    </LegalDocument>
  </MarketingShell>
);

export default CommunityGuidelinesPage;
