import { z } from "zod";

export const RELIABILITY_LEVELS = ["GOOD", "WARNING", "REVIEW"] as const;
export type ReliabilityLevel = (typeof RELIABILITY_LEVELS)[number];

export const brandToWatchSchema = z.object({
  brandId: z.string(),
  brandName: z.string(),
  incidentCount: z.number(),
  level: z.enum(RELIABILITY_LEVELS),
});
export type BrandToWatch = z.infer<typeof brandToWatchSchema>;

export const brandsToWatchResponseSchema = z.object({ brands: z.array(brandToWatchSchema) });
