import "server-only";

import type { ProductSort } from "@outfiqe/utils";
import { z } from "zod";

import {
  type FeedPage,
  feedPageSchema,
  type FeedPost,
} from "@/features/explore/api/exploreFeedSchemas";
import type { ExploreProduct } from "@/features/landing/components/ProductCard";
import { serverApiRequest } from "@/shared/lib/serverApiClient";

import {
  type ProductPage,
  productPageSchema,
  type PublicProduct,
  publicProductSchema,
} from "./productSchemas";
import { toExploreProduct } from "./toExploreProduct";

const productListSchema = z.array(publicProductSchema);

type GetProductsFirstPageServerInput = {
  category?: string;
  type?: string;
  sort?: ProductSort;
};

export const getProductsFirstPageServer = async ({
  category,
  type,
  sort,
}: GetProductsFirstPageServerInput): Promise<ProductPage | null> => {
  try {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (type) params.set("type", type);
    if (sort) params.set("sort", sort);

    const raw = await serverApiRequest<ProductPage>(`/products?${params.toString()}`);
    return productPageSchema.parse(raw);
  } catch {
    return null;
  }
};

export const getTrendingProductsServer = async (): Promise<ExploreProduct[]> => {
  try {
    const raw = await serverApiRequest<PublicProduct[]>("/products/trending");
    return productListSchema.parse(raw).map(toExploreProduct);
  } catch {
    return [];
  }
};

export const getNewArrivalsServer = async (): Promise<ExploreProduct[]> => {
  try {
    const raw = await serverApiRequest<PublicProduct[]>("/products/new-arrivals");
    return productListSchema.parse(raw).map(toExploreProduct);
  } catch {
    return [];
  }
};

export const getFeaturedCreatorLooksServer = async (): Promise<FeedPost[]> => {
  try {
    const raw = await serverApiRequest<FeedPage>("/creator-looks");
    return feedPageSchema.parse(raw).posts;
  } catch {
    return [];
  }
};
