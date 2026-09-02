import type { Metadata } from "next";
import Link from "next/link";

import { MarketingHero, MarketingSection, MarketingShell } from "@/features/marketing";
import { buildPageMetadata, contactEmail, socialProfileUrls } from "@/shared/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact Outfiqe",
  description:
    "Get in touch with Outfiqe — order help, brand and creator enquiries, press and partnerships. Find the right channel and how to reach us.",
  path: "/contact",
  keywords: ["contact Outfiqe", "Outfiqe support", "Outfiqe customer service"],
});

const channels = [
  {
    heading: "Order help",
    body: "Question about an order, delivery or a return? Start with the help centre — it covers the most common issues, and tells you how to reach support if you still need a hand.",
    action: { href: "/help", label: "Visit the help centre" },
  },
  {
    heading: "Sell on Outfiqe",
    body: "Run a Nepali clothing brand? Apply to list — we review every application and get back to you.",
    action: { href: "/apply", label: "Apply to list your brand" },
  },
  {
    heading: "Become a creator",
    body: "Want to earn from the outfits you post? Create an account and apply from your dashboard.",
    action: { href: "/for-creators", label: "Learn about the creator programme" },
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
      lede="Pick the channel that matches what you need. For most order questions, the help centre is the fastest route."
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
