import { type ProductPage, productPageSchema } from "@/features/products/api/productSchemas";
import { apiClient } from "@/shared/lib/apiClient";

import { type WishlistResult, wishlistResultSchema } from "./wishlistSchemas";

export const wishlistApi = {
  async save(productId: string): Promise<WishlistResult> {
    const res = await apiClient.post<WishlistResult>(`/wishlist/${productId}`);
    return wishlistResultSchema.parse(res.data);
  },

  async unsave(productId: string): Promise<WishlistResult> {
    const res = await apiClient.del<WishlistResult>(`/wishlist/${productId}`);
    return wishlistResultSchema.parse(res.data);
  },

  async list(cursor?: string): Promise<ProductPage> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<ProductPage>(`/wishlist?${params.toString()}`);
    return productPageSchema.parse(res.data);
  },
};
