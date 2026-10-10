import { z } from "zod";

import { apiClient } from "@/shared/lib/apiClient";

export const publicProductTypeSchema = z.object({
  id: z.string(),
  slug: z.string(),
  label: z.string(),
  supportsFitRanges: z.boolean().optional(),
});
export type PublicProductType = z.infer<typeof publicProductTypeSchema>;

export const productTypeListSchema = z.array(publicProductTypeSchema);

export const assignableProductTypeSchema = publicProductTypeSchema.extend({
  supportsFitRanges: z.boolean(),
});
export type AssignableProductType = z.infer<typeof assignableProductTypeSchema>;

const assignableProductTypeListSchema = z.array(assignableProductTypeSchema);

export const productTypesApi = {
  async list(): Promise<PublicProductType[]> {
    const res = await apiClient.get<PublicProductType[]>("/product-types");
    return productTypeListSchema.parse(res.data);
  },

  async listAssignable(): Promise<AssignableProductType[]> {
    const res = await apiClient.get<AssignableProductType[]>("/product-types/assignable");
    return assignableProductTypeListSchema.parse(res.data);
  },
};
