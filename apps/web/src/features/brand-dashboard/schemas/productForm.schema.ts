import { PRODUCT_TYPE_SLUGS } from "@outfiqe/utils";
import { z } from "zod";

const NAME_MIN = 2;
const NAME_MAX = 150;
const MAX_IMAGES = 6;

export const productFormSchema = z.object({
  name: z.string().trim().min(NAME_MIN, "Enter a product name").max(NAME_MAX),
  price: z.number().int().min(1, "Enter a price"),
  type: z.enum(PRODUCT_TYPE_SLUGS),
  categories: z.array(z.string()).min(1, "Select at least one category"),
  imageUrls: z.array(z.url()).max(MAX_IMAGES).optional(),
  lowStock: z.boolean().optional(),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;
