import type { Metadata } from "next";

import { LegalDocument, MarketingShell } from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Cookie policy",
  description:
    "The cookies and similar technologies Outfiqe uses, what each is for, and how to control them.",
  path: "/legal/cookies",
});

const CookiesPage = () => (
  <MarketingShell
    width="prose"
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Legal", path: "/legal/cookies" },
      { name: "Cookie policy", path: "/legal/cookies" },
    ]}
  >
    <LegalDocument
      title="Cookie policy"
      summary="This policy explains how Outfiqe uses cookies and similar storage in your browser."
      lastReviewed="[NEEDS INPUT: effective date]"
      status="draft"
    >
      <h2>What cookies are</h2>
      <p>
        Cookies and similar technologies (local storage, session identifiers) are small pieces of
        data stored by your browser. We use them to keep you signed in, remember preferences, and
        understand how the site is used.
      </p>

      <h2>How we use them</h2>
      <h3>Strictly necessary</h3>
      <ul>
        <li>Authentication — keeping you signed in and protecting your session.</li>
        <li>Security — cross-site request protection and abuse prevention.</li>
        <li>Cart and checkout state.</li>
      </ul>
      <h3>Functional</h3>
      <ul>
        <li>Remembering your theme and display preferences.</li>
        <li>
          A session identifier used to attribute a sale to the creator whose look or link you
          followed.
        </li>
      </ul>
      <h3>Analytics and diagnostics</h3>
      <ul>
        <li>Aggregate usage measurement and error reporting to keep the site working.</li>
      </ul>
      <p>
        <strong>
          [NEEDS INPUT: confirm the exact analytics/diagnostics providers and whether any
          advertising cookies are used.]
        </strong>
      </p>

      <h2>Managing cookies</h2>
      <p>
        You can clear or block cookies in your browser settings. Blocking strictly necessary cookies
        will stop parts of Outfiqe from working — for example, staying signed in or checking out.
      </p>

      <h2>Changes</h2>
      <p>We will update this policy as our use of cookies changes and post the new version here.</p>
    </LegalDocument>
  </MarketingShell>
);

export default CookiesPage;
