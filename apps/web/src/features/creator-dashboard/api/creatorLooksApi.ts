import { z } from "zod";

import { type ProductPage, productPageSchema } from "@/features/products/api/productSchemas";
import { apiClient } from "@/shared/lib/apiClient";

import type { LookFormInput } from "../schemas/lookForm.schema";
import { type CreatorLook, creatorLookSchema } from "./creatorLooksSchemas";

const creatorLookPageSchema = z.object({
  looks: z.array(creatorLookSchema),
  nextCursor: z.string().nullable(),
});
export type CreatorLookPage = z.infer<typeof creatorLookPageSchema>;

const TAGGABLE_PRODUCTS_LIMIT = 20;

export const creatorLooksApi = {
  async listMine(cursor?: string): Promise<CreatorLookPage> {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const res = await apiClient.get<CreatorLookPage>(`/creator-looks/mine${params}`);
    return creatorLookPageSchema.parse(res.data);
  },

  async create(input: LookFormInput): Promise<CreatorLook> {
    const res = await apiClient.post<CreatorLook>("/creator-looks", input);
    return creatorLookSchema.parse(res.data);
  },

  async listTaggableProducts(q?: string): Promise<ProductPage> {
    const params = new URLSearchParams({ limit: String(TAGGABLE_PRODUCTS_LIMIT) });
    if (q) params.set("q", q);
    const res = await apiClient.get<ProductPage>(`/products?${params.toString()}`);
    return productPageSchema.parse(res.data);
  },
};
