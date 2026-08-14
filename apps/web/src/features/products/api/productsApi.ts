import { apiClient } from "@/shared/lib/apiClient";

import { type ProductPage, productPageSchema } from "./productSchemas";

type ListProductsInput = {
  category: string;
  type?: string;
  cursor?: string;
};

export const productsApi = {
  async list({ category, type, cursor }: ListProductsInput): Promise<ProductPage> {
    const params = new URLSearchParams({ category });
    if (type) params.set("type", type);
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<ProductPage>(`/products?${params.toString()}`);
    return productPageSchema.parse(res.data);
  },
};
