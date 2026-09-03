import {
  absoluteUrl,
  contactEmail,
  logoUrl,
  organization,
  siteDescription,
  siteName,
  siteUrl,
  socialProfileUrls,
} from "./siteConfig";

type JsonLdNode = Record<string, unknown>;

interface JsonLdProps {
  id: string;
  data: JsonLdNode | JsonLdNode[];
}

export const JsonLd = ({ id, data }: JsonLdProps) => (
  <script
    id={id}
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
  />
);

export const organizationSchema = (): JsonLdNode => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${siteUrl}/#organization`,
  name: siteName,
  legalName: organization.legalName,
  url: siteUrl,
  logo: logoUrl,
  description: siteDescription,
  areaServed: organization.areaServed,
  ...(contactEmail
    ? {
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: contactEmail,
          areaServed: organization.foundingCountry,
          availableLanguage: organization.languages,
        },
      }
    : {}),
  ...(socialProfileUrls.length > 0 ? { sameAs: socialProfileUrls } : {}),
});

export const websiteSchema = (): JsonLdNode => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  name: siteName,
  url: siteUrl,
  description: siteDescription,
  publisher: { "@id": `${siteUrl}/#organization` },
  inLanguage: "en-NP",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/shop?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
});

export interface Breadcrumb {
  name: string;
  path: string;
}

export const breadcrumbSchema = (crumbs: Breadcrumb[]): JsonLdNode => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((crumb, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.name,
    item: absoluteUrl(crumb.path),
  })),
});

export interface ProductSchemaInput {
  name: string;
  description: string;
  path: string;
  image?: string | null;
  priceNpr: number;
  brandName: string;
  inStock: boolean;
  ratingValue?: number | null;
  reviewCount?: number;
}

export const productSchema = (product: ProductSchemaInput): JsonLdNode => {
  const url = absoluteUrl(product.path);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    ...(product.image ? { image: [product.image] } : {}),
    brand: { "@type": "Brand", name: product.brandName },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "NPR",
      price: product.priceNpr,
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: product.brandName },
    },
    ...(product.ratingValue && product.reviewCount && product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.ratingValue,
            reviewCount: product.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
};

export interface ItemListEntry {
  name: string;
  path: string;
  image?: string | null;
}

export const itemListSchema = (name: string, entries: ItemListEntry[]): JsonLdNode => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name,
  numberOfItems: entries.length,
  itemListElement: entries.map((entry, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: absoluteUrl(entry.path),
    name: entry.name,
    ...(entry.image ? { image: entry.image } : {}),
  })),
});

export const collectionPageSchema = (input: {
  name: string;
  description: string;
  path: string;
}): JsonLdNode => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: input.name,
  description: input.description,
  url: absoluteUrl(input.path),
  isPartOf: { "@id": `${siteUrl}/#website` },
});

export const brandStoreSchema = (input: {
  name: string;
  description: string;
  path: string;
  image?: string | null;
}): JsonLdNode => ({
  "@context": "https://schema.org",
  "@type": "Brand",
  name: input.name,
  description: input.description,
  url: absoluteUrl(input.path),
  ...(input.image ? { logo: input.image } : {}),
});

export const profilePageSchema = (input: {
  name: string;
  handle: string;
  path: string;
  image?: string | null;
}): JsonLdNode => ({
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  mainEntity: {
    "@type": "Person",
    name: input.name,
    alternateName: `@${input.handle}`,
    url: absoluteUrl(input.path),
    ...(input.image ? { image: input.image } : {}),
  },
});

export interface FaqEntry {
  question: string;
  answer: string;
}

export const faqPageSchema = (entries: FaqEntry[]): JsonLdNode => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: entries.map((entry) => ({
    "@type": "Question",
    name: entry.question,
    acceptedAnswer: { "@type": "Answer", text: entry.answer },
  })),
});
