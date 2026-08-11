import { z } from "zod";
import type { CategoryStatus } from "@outfiqe/shared-types";

const statusValues = ["DRAFT", "PUBLISHED"] satisfies CategoryStatus[];
export const categoryStatusSchema = z.enum(statusValues);
export type CategoryStatusValue = z.infer<typeof categoryStatusSchema>;

export const categorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  status: categoryStatusSchema,
  sortOrder: z.number(),
  productCount: z.number(),
});
export type Category = z.infer<typeof categorySchema>;
