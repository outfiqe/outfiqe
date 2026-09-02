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
    "Answers to common Outfiqe questions — orders, delivery across Nepal, cash on delivery and wallet payments, cancellations, returns, sizing and accounts.",
  path: "/help",
  keywords: ["Outfiqe help", "Outfiqe FAQ", "Outfiqe order support", "Outfiqe returns"],
});

const orderFaqs = [
  {
    question: "How do I track my order?",
    answer:
      "Sign in and open Your orders. Each order shows its current status — placed, packed, shipped or delivered.",
  },
  {
    question: "Can I cancel my order?",
    answer:
      "You can cancel an order yourself while it is still placed or packed. Once it ships, it can no longer be cancelled from your account — contact us instead.",
  },
  {
    question: "How long does delivery take?",
    answer:
      "Delivery time depends on your area. Kathmandu Valley is usually the fastest; other zones take longer. The delivery estimate for your address is shown at checkout.",
  },
];

const paymentFaqs = [
  {
    question: "What payment methods can I use?",
    answer:
      "Cash on delivery, eSewa and Khalti. Cash-on-delivery orders add a small handling fee, shown before you pay.",
  },
  {
    question: "When is my card or wallet charged?",
    answer:
      "For wallet payments, you're taken to eSewa or Khalti to authorise the payment. Your order is confirmed once the payment is verified. For cash on delivery, you pay the rider on delivery.",
  },
  {
    question: "My payment failed but money left my wallet — what now?",
    answer:
      "If a wallet payment doesn't confirm within an hour, the order is released and any charge is reconciled. If you were charged and the order didn't confirm, contact us with your order details.",
  },
];

const returnsFaqs = [
  {
    question: "Can I return an item?",
    answer:
      "Return eligibility, timelines and how refunds are issued are set out in our return and refund policy. Start there, then contact us to begin a return.",
  },
  {
    question: "How are refunds paid?",
    answer:
      "Refunds are issued to the original payment method where possible. Cash-on-delivery refunds are arranged directly. Timelines are in the return and refund policy.",
  },
];

const accountFaqs = [
  {
    question: "Do I need to verify my email?",
    answer:
      "Yes. You can browse without an account, but saving items, checking out and tracking orders require a verified email.",
  },
  {
    question: "How do I change my password?",
    answer:
      "Sign in, open Settings, then Security, and use Change password. If you're locked out, use Forgot password from the sign-in screen.",
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
      lede="The quick answers to the questions we're asked most. For anything not covered here, use the contact page."
    />

    <MarketingSection heading="Orders & delivery">
      <FaqAccordion entries={orderFaqs} withSchema schemaId="help-orders-faq" />
    </MarketingSection>

    <MarketingSection heading="Payments & cash on delivery">
      <FaqAccordion entries={paymentFaqs} />
    </MarketingSection>

    <MarketingSection heading="Returns & refunds">
      <FaqAccordion entries={returnsFaqs} />
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
