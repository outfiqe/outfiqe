import "server-only";

import { getServerAccessToken } from "@/features/auth/api/serverAuth";
import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { type ProductDetail, productDetailSchema } from "./productDetailSchemas";

export const getProductDetailServer = async (id: string): Promise<ProductDetail | null> => {
  try {
    const accessToken = await getServerAccessToken();
    const raw = await serverApiRequest<ProductDetail>(`/products/${id}`, {
      accessToken: accessToken ?? undefined,
    });
    return productDetailSchema.parse(raw);
  } catch {
    return null;
  }
};
