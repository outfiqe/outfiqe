import type { CategoryStatus } from "@outfiqe/types";
import { z } from "zod";

const NAME_MIN = 2;
const NAME_MAX = 60;
const SLUG_MAX = 60;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const statusValues = ["DRAFT", "PUBLISHED"] satisfies CategoryStatus[];
export const categoryStatusSchema = z.enum(statusValues);

export const categorySlugSchema = z
  .string()
  .trim()
  .min(NAME_MIN)
  .max(SLUG_MAX)
  .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens only.");

export const createCategorySchema = z.object({
  name: z.string().trim().min(NAME_MIN).max(NAME_MAX),
  slug: categorySlugSchema,
  imageUrl: z.url().optional(),
  status: categoryStatusSchema.optional(),
  sortOrder: z.number().int().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryIdParamSchema = z.object({ id: z.uuid() });

export const reorderCategoriesSchema = z.object({
  orderedIds: z.array(z.uuid()).min(1),
});

export type CreateCategoryBody = z.infer<typeof createCategorySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>;
export type CategoryIdParam = z.infer<typeof categoryIdParamSchema>;
export type ReorderCategoriesBody = z.infer<typeof reorderCategoriesSchema>;
