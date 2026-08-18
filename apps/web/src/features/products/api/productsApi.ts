import type { ProductSort } from "@outfiqe/utils";

import { apiClient } from "@/shared/lib/apiClient";

import {
  type ProductPage,
  productPageSchema,
  type ProductSuggestion,
  productSuggestionSchema,
} from "./productSchemas";

type ListProductsInput = {
  category?: string;
  type?: string;
  sort?: ProductSort;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  cursor?: string;
};

export const productsApi = {
  async list({
    category,
    type,
    sort,
    q,
    minPrice,
    maxPrice,
    inStock,
    cursor,
  }: ListProductsInput): Promise<ProductPage> {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (type) params.set("type", type);
    if (sort) params.set("sort", sort);
    if (q) params.set("q", q);
    if (minPrice !== undefined) params.set("minPrice", String(minPrice));
    if (maxPrice !== undefined) params.set("maxPrice", String(maxPrice));
    if (inStock !== undefined) params.set("inStock", String(inStock));
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<ProductPage>(`/products?${params.toString()}`);
    return productPageSchema.parse(res.data);
  },

  async autocomplete(q: string): Promise<ProductSuggestion[]> {
    const res = await apiClient.get<ProductSuggestion[]>(
      `/products/autocomplete?q=${encodeURIComponent(q)}`,
    );
    return productSuggestionSchema.array().parse(res.data);
  },
};
