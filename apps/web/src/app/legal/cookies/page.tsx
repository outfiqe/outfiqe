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
        Cookies, and similar storage in your browser, are small pieces of data saved on your device.
        We use them to keep you signed in, keep your account secure, remember your choices, and make
        the app work offline.
      </p>

      <h2>How we use them</h2>
      <h3>Strictly necessary</h3>
      <ul>
        <li>
          Keeping you signed in: a secure sign-in cookie that can&apos;t be read by scripts on the
          page, and a small cookie that tells the site you have a session.
        </li>
        <li>Security: a cookie that protects your account against cross-site requests.</li>
        <li>Checkout: remembering a Buy now item while you check out.</li>
      </ul>
      <h3>Functional</h3>
      <ul>
        <li>Remembering your language, theme and the style categories you picked.</li>
        <li>
          A random visitor ID, so that when you buy something after tapping a muse&apos;s look or
          link, the sale is credited to that muse.
        </li>
        <li>
          Small reminders, such as whether you dismissed the install or notification prompt, and
          your saved measurements if you choose to keep them on this device.
        </li>
        <li>
          Offline storage, so the installed app can open without a connection and send actions once
          you&apos;re back online.
        </li>
      </ul>
      <h3>Diagnostics</h3>
      <ul>
        <li>
          Error reporting through Sentry, so we can find and fix problems that break the site.
        </li>
      </ul>
      <p>
        <strong>
          [NEEDS INPUT: confirm whether any analytics or advertising cookies are added in future.]
        </strong>
      </p>

      <h2>Managing cookies</h2>
      <p>
        You can clear or block cookies and site data in your browser settings. If you block the
        strictly necessary ones, parts of Outfiqe will stop working, such as staying signed in or
        checking out.
      </p>

      <h2>Changes</h2>
      <p>
        We will update this policy as our use of cookies changes and publish the new version here.
      </p>
    </LegalDocument>
  </MarketingShell>
);

export default CookiesPage;
