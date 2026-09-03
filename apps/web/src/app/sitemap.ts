import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/shared/seo";
import { staticSeoRoutes } from "@/shared/seo/routes";
import {
  getSitemapBrands,
  getSitemapCategories,
  getSitemapCollections,
  getSitemapCreators,
  getSitemapProducts,
} from "@/shared/seo/sitemapSources";

export const revalidate = 21600;

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = staticSeoRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const [products, brands, collections, categories, creators] = await Promise.all([
    getSitemapProducts(),
    getSitemapBrands(),
    getSitemapCollections(),
    getSitemapCategories(),
    getSitemapCreators(),
  ]);

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/product/${product.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const brandEntries: MetadataRoute.Sitemap = brands.map((brand) => ({
    url: absoluteUrl(`/brand/${brand.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const collectionEntries: MetadataRoute.Sitemap = collections.map((collection) => ({
    url: absoluteUrl(`/collections/${collection.slug}`),
    lastModified: collection.updatedAt ? new Date(collection.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: absoluteUrl(`/shop?category=${category.slug}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const creatorEntries: MetadataRoute.Sitemap = creators.map((creator) => ({
    url: absoluteUrl(`/creator/${creator.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [
    ...staticEntries,
    ...categoryEntries,
    ...collectionEntries,
    ...brandEntries,
    ...creatorEntries,
    ...productEntries,
  ];
};

export default sitemap;
