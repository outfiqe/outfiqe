import type { Metadata } from "next";

import { LegalDocument, MarketingShell } from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy policy",
  description:
    "How Outfiqe collects, uses, stores and protects your personal information when you shop, sell or create on the platform.",
  path: "/legal/privacy",
});

const PrivacyPage = () => (
  <MarketingShell
    width="prose"
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Legal", path: "/legal/privacy" },
      { name: "Privacy policy", path: "/legal/privacy" },
    ]}
  >
    <LegalDocument
      title="Privacy policy"
      summary="This policy explains what personal information Outfiqe collects, why we collect it, how we use and share it, and the choices you have."
      lastReviewed="[NEEDS INPUT: effective date]"
      status="draft"
    >
      <h2>Who we are</h2>
      <p>
        Outfiqe operates a fashion marketplace connecting shoppers, creators and clothing brands in
        Nepal. In this policy, &ldquo;Outfiqe&rdquo;, &ldquo;we&rdquo; and &ldquo;us&rdquo; refer to{" "}
        <strong>[NEEDS INPUT: registered legal entity name and registration number]</strong>,
        registered at <strong>[NEEDS INPUT: registered address]</strong>. For any privacy question
        or request, contact <strong>[NEEDS INPUT: privacy / grievance contact email]</strong>.
      </p>

      <h2>Information we collect</h2>
      <h3>Information you give us</h3>
      <ul>
        <li>
          Account details: name, email address, phone number and password (stored only as a hash).
        </li>
        <li>Order details: delivery name, address, landmark, city and contact phone number.</li>
        <li>
          Creator and brand details: profile information, and, for withdrawals, bank account
          information, which is encrypted at rest and only decrypted for a payout.
        </li>
        <li>Content you post: looks, photos, reviews, messages and support requests.</li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li>
          Device and usage data: pages viewed, taps on creator tags and links, and session
          identifiers used for attribution.
        </li>
        <li>Cookies and similar technologies. See our cookie policy.</li>
        <li>Error and performance diagnostics through our error-reporting provider.</li>
      </ul>
      <h3>Information from third parties</h3>
      <ul>
        <li>
          If you sign in with Google or Facebook, we receive your name and email address from that
          provider.
        </li>
        <li>
          Payment status information from eSewa and Khalti when you pay by wallet. We do not receive
          or store your full wallet or card credentials.
        </li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>To create and secure your account, and to authenticate you.</li>
        <li>To process orders, arrange delivery, and handle cancellations, returns and refunds.</li>
        <li>
          To attribute sales to creators and calculate and pay commissions and brand settlements.
        </li>
        <li>
          To provide support, and to send transactional messages about your orders and account.
        </li>
        <li>To detect, prevent and investigate fraud, abuse and security incidents.</li>
        <li>To improve the product and understand how it is used, in aggregate.</li>
        <li>
          To send marketing communications where you have opted in or where the law permits. You can
          opt out at any time.
        </li>
      </ul>

      <h2>Legal bases</h2>
      <p>
        We process your information to perform our contract with you (orders, payouts), for our
        legitimate interests (security, fraud prevention, product improvement), to comply with legal
        obligations, and with your consent where required (for example, non-essential cookies and
        opt-in marketing).{" "}
        <strong>
          [NEEDS INPUT: confirm the applicable data-protection framework and legal bases for Nepal
          and any other market served.]
        </strong>
      </p>

      <h2>How we share information</h2>
      <ul>
        <li>
          <strong>Brands:</strong> when you place an order, the relevant brand receives the
          information needed to prepare it. Buyer contact and address details are managed by Outfiqe
          and are not exposed to brands beyond what fulfilment requires.
        </li>
        <li>
          <strong>Delivery partners:</strong> your delivery name, address and phone number to
          complete delivery.
        </li>
        <li>
          <strong>Payment providers:</strong> eSewa and Khalti, to process and verify wallet
          payments and refunds.
        </li>
        <li>
          <strong>Service providers:</strong> hosting, error reporting, email delivery and
          analytics, under contract and only for the purposes above.
        </li>
        <li>
          <strong>Legal and safety:</strong> where required by law, or to protect the rights,
          property or safety of Outfiqe, our users or the public.
        </li>
        <li>
          <strong>Business transfers:</strong> in connection with a merger, acquisition or sale of
          assets, subject to this policy.
        </li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>Retention</h2>
      <p>
        We keep personal information for as long as your account is active and as needed to provide
        the service, then for the period required to meet legal, accounting, tax and dispute-
        resolution obligations.{" "}
        <strong>
          [NEEDS INPUT: confirm retention periods, especially for financial and bank-account
          records.]
        </strong>
      </p>

      <h2>Security</h2>
      <p>
        Passwords are hashed and never stored in plain text. Bank account numbers are encrypted at
        rest and access to decrypt them is restricted and logged. Access tokens are short-lived and
        sessions can be revoked. No system is perfectly secure, but we take reasonable technical and
        organisational measures to protect your information.
      </p>

      <h2>Your rights and choices</h2>
      <ul>
        <li>
          Access, correct or delete your account information from your account settings, or by
          contacting us.
        </li>
        <li>Opt out of marketing messages using the unsubscribe link or your settings.</li>
        <li>Disconnect a linked Google or Facebook sign-in from your account settings.</li>
        <li>
          Request a copy of your data, or restrict or object to certain processing, where the law
          provides for it.
        </li>
      </ul>
      <p>
        <strong>
          [NEEDS INPUT: describe the complaint route and supervisory authority, if any.]
        </strong>
      </p>

      <h2>Children</h2>
      <p>
        Outfiqe is not directed at children under <strong>[NEEDS INPUT: minimum age]</strong>. We do
        not knowingly collect their information.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We will update this policy as the product and the law change, and will post the new version
        here with a revised review date. Material changes will be communicated in the app or by
        email.
      </p>
    </LegalDocument>
  </MarketingShell>
);

export default PrivacyPage;
