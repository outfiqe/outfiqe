import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

const BRAND_SEARCH_RESULT_LIMIT = 8;

export const brandSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
});
export type BrandSearchResult = z.infer<typeof brandSearchResultSchema>;

const brandSearchResultListSchema = z.array(brandSearchResultSchema);

export const brandsApi = {
  async search(q: string): Promise<BrandSearchResult[]> {
    const res = await apiClient.get<{ brands: BrandSearchResult[] }>("/brands", {
      params: { q, limit: BRAND_SEARCH_RESULT_LIMIT },
    });
    return brandSearchResultListSchema.parse(res.data.brands);
  },
};
