import { z } from "zod";

import { apiClient } from "@/shared/lib/apiClient";
import { brandProductSchema, type BrandProduct } from "./brandProductsSchemas";
import type { ProductFormInput } from "../schemas/productForm.schema";

const brandProductPageSchema = z.object({
  products: z.array(brandProductSchema),
  nextCursor: z.string().nullable(),
});
export type BrandProductPage = z.infer<typeof brandProductPageSchema>;

export const brandProductsApi = {
  async list(cursor?: string): Promise<BrandProductPage> {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const res = await apiClient.get<BrandProductPage>(`/products/mine${params}`);
    return brandProductPageSchema.parse(res.data);
  },

  async create(input: ProductFormInput): Promise<BrandProduct> {
    const res = await apiClient.post<BrandProduct>("/products", input);
    return brandProductSchema.parse(res.data);
  },
};
