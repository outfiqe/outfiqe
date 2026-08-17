import type { ProductSort } from "@outfiqe/utils";

import { apiClient } from "@/shared/lib/apiClient";

import { type ProductPage, productPageSchema } from "./productSchemas";

type ListProductsInput = {
  category?: string;
  type?: string;
  sort?: ProductSort;
  cursor?: string;
};

export const productsApi = {
  async list({ category, type, sort, cursor }: ListProductsInput): Promise<ProductPage> {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (type) params.set("type", type);
    if (sort) params.set("sort", sort);
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<ProductPage>(`/products?${params.toString()}`);
    return productPageSchema.parse(res.data);
  },
};
