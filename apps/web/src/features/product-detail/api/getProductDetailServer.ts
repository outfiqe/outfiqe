import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";
import { productDetailSchema, type ProductDetail } from "./productDetailSchemas";

export const getProductDetailServer = async (id: string): Promise<ProductDetail | null> => {
  try {
    const raw = await serverApiRequest<ProductDetail>(`/products/${id}`);
    return productDetailSchema.parse(raw);
  } catch {
    return null;
  }
};
