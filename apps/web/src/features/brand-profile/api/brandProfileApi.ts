import { apiClient } from "@/shared/lib/apiClient";
import { productPageSchema, type ProductPage } from "@/features/products/api/productSchemas";
import { brandProfileSchema, type BrandProfile } from "./brandProfileSchemas";

export const brandProfileApi = {
  async get(id: string): Promise<BrandProfile> {
    const res = await apiClient.get<BrandProfile>(`/brands/${id}`);
    return brandProfileSchema.parse(res.data);
  },

  async listProducts(id: string, cursor?: string, type?: string): Promise<ProductPage> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (type) params.set("type", type);

    const res = await apiClient.get<ProductPage>(`/brands/${id}/products?${params.toString()}`);
    return productPageSchema.parse(res.data);
  },
};
