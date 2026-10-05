import { z } from "zod";

const SIZE_LABEL_MAX_LENGTH = 40;

export const productTypeIdParamsSchema = z.object({ productTypeId: z.uuid() });

export const saveSizeBodySchema = z.object({
  sizeLabel: z.string().trim().min(1).max(SIZE_LABEL_MAX_LENGTH),
});

export type ProductTypeIdParams = z.infer<typeof productTypeIdParamsSchema>;
export type SaveSizeBody = z.infer<typeof saveSizeBodySchema>;
