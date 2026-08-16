import { apiClient } from "@/shared/lib/apiClient";

import { type BrandPage, brandPageSchema } from "./brandsSchemas";

export const brandsApi = {
  async list(cursor?: string, limit?: number): Promise<BrandPage> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (limit) params.set("limit", String(limit));

    const res = await apiClient.get<BrandPage>(`/brands?${params.toString()}`);
    return brandPageSchema.parse(res.data);
  },
};
