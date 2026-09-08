import { apiClient } from "@/shared/lib/apiClient";

import { type BrandOrdersPage, brandOrdersPageSchema } from "./brandOrdersSchemas";

export const brandOrdersApi = {
  async list(cursor?: string): Promise<BrandOrdersPage> {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const res = await apiClient.get<BrandOrdersPage>(`/orders/brand${params}`);
    return brandOrdersPageSchema.parse(res.data);
  },
};
