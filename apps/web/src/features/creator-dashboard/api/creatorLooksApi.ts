import { z } from "zod";

import { apiClient } from "@/shared/lib/apiClient";
import { productPageSchema, type ProductPage } from "@/features/products/api/productSchemas";
import { creatorLookSchema, type CreatorLook } from "./creatorLooksSchemas";
import type { LookFormInput } from "../schemas/lookForm.schema";

const listSchema = z.array(creatorLookSchema);
const TAGGABLE_PRODUCTS_LIMIT = 20;

export const creatorLooksApi = {
  async listMine(): Promise<CreatorLook[]> {
    const res = await apiClient.get<unknown>("/creator-looks/mine");
    return listSchema.parse(res.data);
  },

  async create(input: LookFormInput): Promise<CreatorLook> {
    const res = await apiClient.post<unknown>("/creator-looks", input);
    return creatorLookSchema.parse(res.data);
  },

  async listTaggableProducts(q?: string): Promise<ProductPage> {
    const params = new URLSearchParams({ limit: String(TAGGABLE_PRODUCTS_LIMIT) });
    if (q) params.set("q", q);
    const res = await apiClient.get<unknown>(`/products?${params.toString()}`);
    return productPageSchema.parse(res.data);
  },
};
