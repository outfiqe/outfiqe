import { z } from "zod";

export const BRAND_RETURN_STATUSES = ["AT_HUB", "ON_ROUND", "DROPPED_OFF", "CONFIRMED"] as const;
export type BrandReturnStatus = (typeof BRAND_RETURN_STATUSES)[number];

export const BRAND_RETURN_SOURCES = ["PARCEL_RETURNED", "FAILED_INSPECTION"] as const;
export type BrandReturnSource = (typeof BRAND_RETURN_SOURCES)[number];

export const brandReturnSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  source: z.enum(BRAND_RETURN_SOURCES),
  status: z.enum(BRAND_RETURN_STATUSES),
  createdAt: z.string(),
  droppedOffAt: z.string().nullable(),
  confirmedAt: z.string().nullable(),
  isAutoConfirmed: z.boolean(),
  lines: z.array(
    z.object({
      productName: z.string(),
      sizeLabel: z.string(),
      resellableQty: z.number(),
      damagedQty: z.number(),
    }),
  ),
});
export type BrandReturn = z.infer<typeof brandReturnSchema>;

export const brandReturnPageSchema = z.object({
  items: z.array(brandReturnSchema),
  nextCursor: z.string().nullable(),
});
export type BrandReturnPage = z.infer<typeof brandReturnPageSchema>;
