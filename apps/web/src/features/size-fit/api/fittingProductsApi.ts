import type { FitMeasurements } from "@outfiqe/utils";
import { z } from "zod";

import { publicProductSchema } from "@/features/products/api/productSchemas";
import { apiClient } from "@/shared/lib/apiClient";

export const fittingProductSchema = publicProductSchema.extend({
  recommendedSize: z.object({ sizeId: z.string(), label: z.string() }).nullable(),
});
export type FittingProduct = z.infer<typeof fittingProductSchema>;

const fittingProductPageSchema = z.object({
  products: z.array(fittingProductSchema),
  nextCursor: z.string().nullable(),
  total: z.number(),
});
export type FittingProductPage = z.infer<typeof fittingProductPageSchema>;

export type ListFittingProductsInput = FitMeasurements & {
  type?: string;
  cursor?: string;
};

export const fittingProductsApi = {
  async list({
    heightCm,
    weightKg,
    type,
    cursor,
  }: ListFittingProductsInput): Promise<FittingProductPage> {
    const params = new URLSearchParams({ heightCm: String(heightCm), weightKg: String(weightKg) });
    if (type) params.set("type", type);
    if (cursor) params.set("cursor", cursor);
    const res = await apiClient.get<FittingProductPage>(`/products/fits?${params.toString()}`);
    return fittingProductPageSchema.parse(res.data);
  },
};
