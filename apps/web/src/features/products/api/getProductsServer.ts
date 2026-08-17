import "server-only";

import { z } from "zod";

import {
  type FeedPage,
  feedPageSchema,
  type FeedPost,
} from "@/features/explore/api/exploreFeedSchemas";
import type { ExploreProduct } from "@/features/landing/components/ProductCard";
import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { type PublicProduct, publicProductSchema } from "./productSchemas";
import { toExploreProduct } from "./toExploreProduct";

const productListSchema = z.array(publicProductSchema);

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
