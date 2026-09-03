import { z } from "zod";

const LABEL_MIN = 2;
const LABEL_MAX = 40;
const SLUG_MIN = 2;
const SLUG_MAX = 40;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const productTypeSlugSchema = z
  .string()
  .trim()
  .min(SLUG_MIN)
  .max(SLUG_MAX)
  .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens only.");

export const createProductTypeSchema = z.object({
  label: z.string().trim().min(LABEL_MIN).max(LABEL_MAX),
  slug: productTypeSlugSchema,
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateProductTypeSchema = createProductTypeSchema.partial();

export const productTypeIdParamSchema = z.object({ id: z.uuid() });

export const reorderProductTypesSchema = z.object({
  orderedIds: z.array(z.uuid()).min(1),
});

export type CreateProductTypeBody = z.infer<typeof createProductTypeSchema>;
export type UpdateProductTypeBody = z.infer<typeof updateProductTypeSchema>;
export type ProductTypeIdParam = z.infer<typeof productTypeIdParamSchema>;
export type ReorderProductTypesBody = z.infer<typeof reorderProductTypesSchema>;
