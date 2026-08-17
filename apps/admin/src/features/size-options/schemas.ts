import type { ProductTypeSlug } from "@outfiqe/utils";
import { PRODUCT_TYPE_SLUGS } from "@outfiqe/utils";
import { z } from "zod";

export const productTypeSlugSchema = z.enum(PRODUCT_TYPE_SLUGS);

export const sizeOptionSchema = z.object({
  id: z.string(),
  type: productTypeSlugSchema,
  label: z.string(),
  sortOrder: z.number(),
});
export type SizeOption = z.infer<typeof sizeOptionSchema>;

export type { ProductTypeSlug };
