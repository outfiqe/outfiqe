import { z } from "zod";

import { apiClient } from "@/shared/lib/apiClient";

export const publicProductTypeSchema = z.object({
  slug: z.string(),
  label: z.string(),
});
export type PublicProductType = z.infer<typeof publicProductTypeSchema>;

const productTypeListSchema = z.array(publicProductTypeSchema);

export const productTypesApi = {
  async list(): Promise<PublicProductType[]> {
    const res = await apiClient.get<PublicProductType[]>("/products/types");
    return productTypeListSchema.parse(res.data);
  },
};
