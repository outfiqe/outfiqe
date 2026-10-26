import type { Metadata } from "next";
import Link from "next/link";

import { MarketingHero, MarketingSection, MarketingShell } from "@/features/marketing";
import { buildPageMetadata, contactEmail, socialProfileUrls } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact Outfiqe",
  description:
    "Reach Outfiqe for order help, brand and muse enquiries, or press. The right channel for each, and how to get to us.",
  path: "/contact",
  keywords: ["contact Outfiqe", "Outfiqe support", "Outfiqe customer service"],
});

const channels = [
  {
    heading: "Order help",
    body: "Have a question about an order, a delivery or a refund? The help centre answers the most common ones. If you still need help, raise a support request. You'll get a reference number by email and can follow every reply from your account.",
    action: { href: "/support", label: "Raise a support request" },
  },
  {
    heading: "Sell on Outfiqe",
    body: "Run a Nepali clothing brand? Apply to list it. We review every application and email you with the next steps.",
    action: { href: "/apply", label: "Apply to list your brand" },
  },
  {
    heading: "Become a muse",
    body: "Want to earn from the outfits you wear? Create an account and apply from your dashboard.",
    action: { href: "/for-creators", label: "Learn about the muse programme" },
  },
];

const ContactPage = () => (
  <MarketingShell
    width="prose"
    breadcrumbs={[
      { name: "Home", path: "/" },
      { name: "Contact", path: "/contact" },
    ]}
  >
    <MarketingHero
      eyebrow="Contact"
      title="Get in touch"
      lede="Choose the option that fits what you need. For most order questions, the help centre is the quickest way to an answer."
    />

    <div className="mt-12 space-y-8">
      {channels.map((channel) => (
        <div key={channel.heading} className="border-t-2 border-foreground pt-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
            {channel.heading}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{channel.body}</p>
          <Link
            href={channel.action.href}
            className="mt-3 inline-block text-sm font-medium text-foreground underline underline-offset-2"
          >
            {channel.action.label}
          </Link>
        </div>
      ))}
    </div>

    {contactEmail || socialProfileUrls.length > 0 ? (
      <MarketingSection heading="Reach us directly">
        <ul className="space-y-2 text-sm text-muted-foreground">
          {contactEmail ? (
            <li>
              Email:{" "}
              <a
                href={`mailto:${contactEmail}`}
                className="font-medium text-foreground underline underline-offset-2"
              >
                {contactEmail}
              </a>
            </li>
          ) : null}
          {socialProfileUrls.map((url) => (
            <li key={url}>
              <a
                href={url}
                rel="me noopener noreferrer"
                target="_blank"
                className="font-medium text-foreground underline underline-offset-2"
              >
                {url.replace(/^https?:\/\//, "")}
              </a>
            </li>
          ))}
        </ul>
      </MarketingSection>
    ) : null}
  </MarketingShell>
);

export default ContactPage;
