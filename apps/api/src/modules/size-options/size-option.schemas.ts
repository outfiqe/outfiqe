import { z } from "zod";

import { productTypeSlugSchema } from "#modules/products/product.schemas.js";

const LABEL_MIN = 1;
const LABEL_MAX = 20;

export const createSizeOptionSchema = z.object({
  type: productTypeSlugSchema,
  label: z.string().trim().min(LABEL_MIN).max(LABEL_MAX),
  sortOrder: z.number().int().optional(),
});

export const sizeOptionIdParamSchema = z.object({ id: z.uuid() });

export const listSizeOptionsQuerySchema = z.object({
  type: productTypeSlugSchema,
});

export type CreateSizeOptionBody = z.infer<typeof createSizeOptionSchema>;
export type SizeOptionIdParam = z.infer<typeof sizeOptionIdParamSchema>;
export type ListSizeOptionsQuery = z.infer<typeof listSizeOptionsQuerySchema>;
