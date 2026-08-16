import { z } from "zod";

import { brandProfileSchema } from "@/features/brand-profile/api/brandProfileSchemas";

export const brandSummarySchema = brandProfileSchema;
export type BrandSummary = z.infer<typeof brandSummarySchema>;

export const brandPageSchema = z.object({
  brands: z.array(brandSummarySchema),
  nextCursor: z.string().nullable(),
  total: z.number(),
});
export type BrandPage = z.infer<typeof brandPageSchema>;
