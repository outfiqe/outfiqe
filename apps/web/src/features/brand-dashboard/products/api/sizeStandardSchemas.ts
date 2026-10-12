import { z } from "zod";

export const sizeStandardLabelSchema = z.object({
  id: z.string(),
  label: z.string(),
});
export type SizeStandardLabel = z.infer<typeof sizeStandardLabelSchema>;

export const sizeStandardSchema = z.object({
  id: z.string(),
  name: z.string(),
  labels: z.array(sizeStandardLabelSchema),
});
export type SizeStandard = z.infer<typeof sizeStandardSchema>;

export const sizeStandardListSchema = z.array(sizeStandardSchema);

export type SizeStandardInput = {
  name: string;
  labels: string[];
};
