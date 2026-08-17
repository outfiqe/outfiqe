import { z } from "zod";

import { productTypeSchema } from "./productSchemas";

export const sizeOptionSchema = z.object({
  id: z.string(),
  type: productTypeSchema,
  label: z.string(),
  sortOrder: z.number(),
});
export type SizeOption = z.infer<typeof sizeOptionSchema>;
