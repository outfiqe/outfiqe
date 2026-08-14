import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { type ProductDetail, productDetailSchema } from "./productDetailSchemas";

export const getProductDetailServer = async (id: string): Promise<ProductDetail | null> => {
  try {
    const raw = await serverApiRequest<ProductDetail>(`/products/${id}`);
    return productDetailSchema.parse(raw);
  } catch {
    return null;
  }
};
