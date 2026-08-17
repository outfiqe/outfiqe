import { z } from "zod";

import { apiClient } from "@/shared/lib/apiClient";

import type { EditProductFormInput, ProductFormInput } from "../schemas/productForm.schema";
import {
  type BrandProduct,
  brandProductSchema,
  type BrandProductSize,
  brandProductSizeSchema,
} from "./brandProductsSchemas";

const brandProductPageSchema = z.object({
  products: z.array(brandProductSchema),
  nextCursor: z.string().nullable(),
});
export type BrandProductPage = z.infer<typeof brandProductPageSchema>;

const brandProductSizeListSchema = z.array(brandProductSizeSchema);

export type StockAdjustment = { sizeId: string; delta: number };

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

  async update(productId: string, input: EditProductFormInput): Promise<BrandProduct> {
    const res = await apiClient.patch<BrandProduct>(`/products/${productId}`, input);
    return brandProductSchema.parse(res.data);
  },

  async adjustStock(
    productId: string,
    adjustments: StockAdjustment[],
  ): Promise<BrandProductSize[]> {
    const res = await apiClient.patch<BrandProductSize[]>(`/products/${productId}/stock`, {
      adjustments,
    });
    return brandProductSizeListSchema.parse(res.data);
  },

  async remove(productId: string): Promise<void> {
    await apiClient.del(`/products/${productId}`);
  },
};
