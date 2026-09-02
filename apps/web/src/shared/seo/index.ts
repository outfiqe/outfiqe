export { Breadcrumbs } from "./Breadcrumbs";
export type { Breadcrumb, FaqEntry, ItemListEntry, ProductSchemaInput } from "./jsonLd";
export {
  brandStoreSchema,
  breadcrumbSchema,
  collectionPageSchema,
  faqPageSchema,
  itemListSchema,
  JsonLd,
  organizationSchema,
  productSchema,
  profilePageSchema,
  websiteSchema,
} from "./jsonLd";
export type { PageMetadataInput } from "./metadata";
export { buildPageMetadata, noIndexMetadata, rootMetadataDefaults } from "./metadata";
export {
  absoluteUrl,
  contactEmail,
  logoUrl,
  siteDescription,
  siteName,
  siteTagline,
  siteUrl,
  socialProfileUrls,
} from "./siteConfig";
