import { z } from "zod";

import { apiClient } from "@/lib/apiClient";
import { productSchema, type ProductStatusValue } from "./schemas";

const productPageSchema = z.object({
  products: z.array(productSchema),
  nextCursor: z.string().nullable(),
});
export type ProductPage = z.infer<typeof productPageSchema>;

export const productsApi = {
  async list(status: ProductStatusValue, cursor?: string): Promise<ProductPage> {
    const params = new URLSearchParams({ status });
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<ProductPage>(`/products/review?${params.toString()}`);
    return productPageSchema.parse(res.data);
  },

  async approve(id: string): Promise<void> {
    await apiClient.post(`/products/${id}/approve`);
  },

  async reject(id: string): Promise<void> {
    await apiClient.post(`/products/${id}/reject`);
  },
};
