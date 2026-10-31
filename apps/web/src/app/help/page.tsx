import type { Metadata } from "next";
import Link from "next/link";

import {
  FaqAccordion,
  MarketingHero,
  MarketingSection,
  MarketingShell,
} from "@/features/marketing";
import { buildPageMetadata } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Help centre",
  description:
    "Answers to common Outfiqe questions: tracking your order, delivery across Nepal, cash on delivery and eSewa, cancelling, refunds, Thrift, reviews and your account.",
  path: "/help",
  keywords: ["Outfiqe help", "Outfiqe FAQ", "Outfiqe order support", "Outfiqe refunds"],
});

const orderFaqs = [
  {
    question: "How do I track my order?",
    answer:
      'Sign in and open Your orders, then tap the order. You\'ll see where it is right now (for example, "We\'re collecting your items from the brand" or "Your order is out for delivery"), the expected delivery date, and a link to follow the parcel on the delivery partner\'s own site. The page updates by itself.',
  },
  {
    question: "Will my order arrive in one parcel?",
    answer:
      "Usually, yes. For most brands, our rider collects your pieces, we check them at our hub and pack your whole order into one parcel. A few brands still send their part themselves, and the order page shows those separately.",
  },
  {
    question: "How long does delivery take?",
    answer:
      "It depends on where you live. Your delivery dates are shown at checkout and on your order page.",
  },
  {
    question: "Can I cancel my order?",
    answer:
      "Open the order. If you see Cancel items, you can cancel some or all of your pieces while the brand still has them, and the refund is worked out straight away. If you don't see it, raise a support request and we'll cancel the order for you if it hasn't shipped yet. If you started an eSewa or Khalti payment but didn't finish it, you can cancel the whole order from the order page.",
  },
  {
    question: "My order says delivered, but I didn't get it.",
    answer:
      'Open the order and tap "I didn\'t receive this" on the parcel within 3 days of delivery. Tell us what happened, and our team will look into it with the delivery partner.',
  },
];

const paymentFaqs = [
  {
    question: "How can I pay?",
    answer:
      "Cash on delivery or eSewa. Cash on delivery adds a small handling fee, which you'll see before you place the order.",
  },
  {
    question: "Why can't I choose cash on delivery?",
    answer:
      "There are two reasons this can happen. The coupon you applied may only work with online payment, or there have been 2 refused deliveries on your account or phone number in the last year. You can still pay with eSewa or Khalti.",
  },
  {
    question: "My payment didn't go through. What now?",
    answer:
      "Open the order. If the payment wasn't completed, you can try again with Resume payment or cancel the order. If money left your wallet but the order still shows unpaid, raise a support request with the order number.",
  },
];

const refundFaqs = [
  {
    question: "When do I get a refund?",
    answer:
      "You get a refund when you cancel pieces, when a brand can't supply an item, when a piece fails our quality check at the hub, or when the delivery partner loses or damages your parcel. The order page shows each refund, why it happened and how the money is coming back.",
  },
  {
    question: "How is the money paid back?",
    answer:
      "For cash on delivery, the amount is simply taken off what you pay the rider. For eSewa payments, we'll ask you for a refund account (eSewa, Khalti or bank) on the order page, and our team sends the money there.",
  },
  {
    question: "Can I return something after delivery?",
    answer:
      "Raise a support request with your order number and photos, and we'll tell you what we can do. The full rules are in our return and refund policy.",
  },
];

const shoppingFaqs = [
  {
    question: "What is Thrift?",
    answer:
      "Thrift pieces are secondhand or one-of-a-kind. Each one shows a condition rating (like new, good or fair) and a note from the seller, and we ask you to confirm you know it's secondhand before you buy.",
  },
  {
    question: "Who can write a review?",
    answer:
      "Only shoppers who have received the product. That's why every review carries a Verified purchase badge.",
  },
];

const accountFaqs = [
  {
    question: "Do I need to verify my email?",
    answer:
      "Yes. You can browse without an account, but checking out, saving pieces and following your orders all need a verified email.",
  },
  {
    question: "How do I change my password?",
    answer:
      "Sign in, open Settings, then Security, and use Change password. If you're locked out, use Forgot password on the sign-in screen.",
  },
];

const HelpPage = () => (
  <MarketingShell
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Help centre", path: "/help" },
    ]}
  >
    <MarketingHero
      eyebrow="Help centre"
      title="How can we help?"
      lede="Quick answers to the questions we're asked most. If yours isn't here, raise a support request and we'll reply by email."
    />

    <MarketingSection heading="Still need help?">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Raise a support request from your account. You&apos;ll get a reference number by email, can
        follow every reply in one place, and can reopen the request if you need to.
      </p>
      <Link
        href="/support"
        className="mt-3 inline-block text-sm font-medium text-foreground underline underline-offset-2"
      >
        Raise a support request
      </Link>
    </MarketingSection>

    <MarketingSection heading="Orders & delivery">
      <FaqAccordion entries={orderFaqs} withSchema schemaId="help-orders-faq" />
    </MarketingSection>

    <MarketingSection heading="Payments & cash on delivery">
      <FaqAccordion entries={paymentFaqs} />
    </MarketingSection>

    <MarketingSection heading="Refunds & returns">
      <FaqAccordion entries={refundFaqs} />
    </MarketingSection>

    <MarketingSection heading="Thrift & reviews">
      <FaqAccordion entries={shoppingFaqs} />
    </MarketingSection>

    <MarketingSection heading="Account">
      <FaqAccordion entries={accountFaqs} />
    </MarketingSection>

    <MarketingSection heading="Policies">
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li>
          <Link
            href="/legal/shipping-policy"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Shipping & delivery policy
          </Link>
        </li>
        <li>
          <Link
            href="/legal/returns-policy"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Return & refund policy
          </Link>
        </li>
        <li>
          <Link
            href="/legal/terms"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Terms of service
          </Link>
        </li>
        <li>
          <Link
            href="/legal/privacy"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Privacy policy
          </Link>
        </li>
      </ul>
    </MarketingSection>
  </MarketingShell>
);

export default HelpPage;
