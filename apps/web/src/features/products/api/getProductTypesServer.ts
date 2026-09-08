import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";
import { SERVER_CACHE_TAGS, SHARED_CONTENT_REVALIDATE_SECONDS } from "@/shared/lib/serverCacheTags";

import { productTypeListSchema, type PublicProductType } from "./productTypesApi";

export const getProductTypesServer = async (): Promise<PublicProductType[]> => {
  try {
    const raw = await serverApiRequest<PublicProductType[]>("/product-types", {
      revalidateSeconds: SHARED_CONTENT_REVALIDATE_SECONDS,
      cacheTags: [SERVER_CACHE_TAGS.productTypes],
    });
    return productTypeListSchema.parse(raw);
  } catch {
    return [];
  }
};
