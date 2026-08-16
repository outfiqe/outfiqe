import { z } from "zod";

import { apiClient } from "@/shared/lib/apiClient";

import { brandOrderItemSchema } from "./brandOrdersSchemas";

const brandOrdersPageSchema = z.object({
  items: z.array(brandOrderItemSchema),
  nextCursor: z.string().nullable(),
});
export type BrandOrdersPage = z.infer<typeof brandOrdersPageSchema>;

export const brandOrdersApi = {
  async list(cursor?: string): Promise<BrandOrdersPage> {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const res = await apiClient.get<BrandOrdersPage>(`/orders/brand${params}`);
    return brandOrdersPageSchema.parse(res.data);
  },
};
