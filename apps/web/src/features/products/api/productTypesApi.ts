import { z } from "zod";

import { apiClient } from "@/shared/lib/apiClient";

export const publicProductTypeSchema = z.object({
  id: z.string(),
  slug: z.string(),
  label: z.string(),
});
export type PublicProductType = z.infer<typeof publicProductTypeSchema>;

export const productTypeListSchema = z.array(publicProductTypeSchema);

export const productTypesApi = {
  async list(): Promise<PublicProductType[]> {
    const res = await apiClient.get<PublicProductType[]>("/product-types");
    return productTypeListSchema.parse(res.data);
  },

  async listAssignable(): Promise<PublicProductType[]> {
    const res = await apiClient.get<PublicProductType[]>("/product-types/assignable");
    return productTypeListSchema.parse(res.data);
  },
};
