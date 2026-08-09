import { z } from "zod";

const CAPTION_MAX = 280;
const MIN_TAGGED_PRODUCTS = 1;
const MAX_TAGGED_PRODUCTS = 6;

export const lookFormSchema = z.object({
  imageUrl: z.url(),
  caption: z.string().max(CAPTION_MAX).optional(),
  productIds: z.array(z.string()).min(MIN_TAGGED_PRODUCTS).max(MAX_TAGGED_PRODUCTS),
});
export type LookFormInput = z.infer<typeof lookFormSchema>;
