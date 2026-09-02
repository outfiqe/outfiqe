import type { Metadata } from "next";

import { absoluteUrl, siteName, siteTagline } from "./siteConfig";

type OgType = "website" | "article" | "profile";

export interface PageMetadataInput {
  title: string;
  description: string;
  path: string;
  ogType?: OgType;
  image?: { url: string; alt: string };
  noIndex?: boolean;
  keywords?: string[];
  absoluteTitle?: boolean;
}

export const buildPageMetadata = ({
  title,
  description,
  path,
  ogType = "website",
  image,
  noIndex = false,
  keywords,
  absoluteTitle = false,
}: PageMetadataInput): Metadata => {
  const canonical = absoluteUrl(path);

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords,
    alternates: { canonical },
    robots: noIndex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
    openGraph: {
      type: ogType,
      siteName,
      title,
      description,
      url: canonical,
      locale: "en_NP",
      ...(image ? { images: [{ url: image.url, alt: image.alt }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image.url] } : {}),
    },
  };
};

export const noIndexMetadata = (title: string): Metadata => ({
  title,
  robots: { index: false, follow: false, nocache: true },
});

const rootDescription =
  "Shop clothing from Nepali brands the way people actually wear it. Every brand paired with real creator looks, one cart, delivered across Nepal.";

export const rootMetadataDefaults: Metadata = {
  applicationName: siteName,
  title: {
    default: `${siteName} — ${siteTagline}`,
    template: `%s · ${siteName}`,
  },
  description: rootDescription,
  keywords: [
    "Nepali fashion",
    "online clothing store Nepal",
    "Nepali clothing brands",
    "buy clothes online Nepal",
    "fashion marketplace Nepal",
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: "website",
    siteName,
    title: `${siteName} — ${siteTagline}`,
    description: rootDescription,
    locale: "en_NP",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — ${siteTagline}`,
    description: rootDescription,
  },
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
  },
  manifest: "/manifest.webmanifest",
};
