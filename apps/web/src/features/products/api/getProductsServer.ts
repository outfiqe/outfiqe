import "server-only";
import { z } from "zod";

import { serverApiRequest } from "@/shared/lib/serverApiClient";
import type { ExploreProduct } from "@/features/landing/components/ProductCard";
import { creatorLookProductPageSchema, publicProductSchema } from "./productSchemas";
import { toExploreProduct } from "./toExploreProduct";

const productListSchema = z.array(publicProductSchema);

export const getTrendingProductsServer = async (): Promise<ExploreProduct[]> => {
  try {
    const raw = await serverApiRequest<unknown>("/products/trending");
    return productListSchema.parse(raw).map(toExploreProduct);
  } catch {
    return [];
  }
};

export const getNewArrivalsServer = async (): Promise<ExploreProduct[]> => {
  try {
    const raw = await serverApiRequest<unknown>("/products/new-arrivals");
    return productListSchema.parse(raw).map(toExploreProduct);
  } catch {
    return [];
  }
};

export const getFeaturedCreatorLooksServer = async (): Promise<ExploreProduct[]> => {
  try {
    const raw = await serverApiRequest<unknown>("/creator-looks");
    return creatorLookProductPageSchema.parse(raw).products.map(toExploreProduct);
  } catch {
    return [];
  }
};
