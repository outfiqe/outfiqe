import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { productTypeListSchema, type PublicProductType } from "./productTypesApi";

export const getProductTypesServer = async (): Promise<PublicProductType[]> => {
  try {
    const raw = await serverApiRequest<PublicProductType[]>("/product-types");
    return productTypeListSchema.parse(raw);
  } catch {
    return [];
  }
};
