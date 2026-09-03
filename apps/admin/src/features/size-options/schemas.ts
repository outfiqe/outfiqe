import { z } from "zod";

export const sizeOptionSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string(),
  sortOrder: z.number(),
});
export type SizeOption = z.infer<typeof sizeOptionSchema>;
