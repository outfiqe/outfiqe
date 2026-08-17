import { type ProductPage, productPageSchema } from "@/features/products/api/productSchemas";
import { apiClient } from "@/shared/lib/apiClient";

import type { LookFormInput } from "../schemas/lookForm.schema";
import {
  type CreatorLook,
  type CreatorLookEditDetail,
  creatorLookEditDetailSchema,
  creatorLookSchema,
} from "./creatorLooksSchemas";

const TAGGABLE_PRODUCTS_LIMIT = 20;

export const creatorLooksApi = {
  async create(input: LookFormInput): Promise<CreatorLook> {
    const res = await apiClient.post<CreatorLook>("/creator-looks", input);
    return creatorLookSchema.parse(res.data);
  },

  async getOwn(lookId: string): Promise<CreatorLookEditDetail> {
    const res = await apiClient.get<CreatorLookEditDetail>(`/creator-looks/${lookId}`);
    return creatorLookEditDetailSchema.parse(res.data);
  },

  async update(lookId: string, input: LookFormInput): Promise<CreatorLook> {
    const res = await apiClient.patch<CreatorLook>(`/creator-looks/${lookId}`, input);
    return creatorLookSchema.parse(res.data);
  },

  async remove(lookId: string): Promise<void> {
    await apiClient.del(`/creator-looks/${lookId}`);
  },

  async listTaggableProducts(q?: string): Promise<ProductPage> {
    const params = new URLSearchParams({ limit: String(TAGGABLE_PRODUCTS_LIMIT) });
    if (q) params.set("q", q);
    const res = await apiClient.get<ProductPage>(`/products?${params.toString()}`);
    return productPageSchema.parse(res.data);
  },
};
