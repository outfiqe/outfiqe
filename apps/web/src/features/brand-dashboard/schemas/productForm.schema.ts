import { z } from "zod";

export const PRODUCT_TYPE_VALUES = [
  "tops",
  "bottoms",
  "pants",
  "headwear",
  "outerwear",
  "dresses",
] as const;

export const PRODUCT_TYPE_LABEL: Record<(typeof PRODUCT_TYPE_VALUES)[number], string> = {
  tops: "Tops",
  bottoms: "Bottoms",
  pants: "Pants",
  headwear: "Headwear",
  outerwear: "Outerwear",
  dresses: "Dresses",
};

export const TASTE_CATEGORY_VALUES = [
  "formal",
  "traditional",
  "streetwear",
  "casual",
  "minimal",
  "y2k",
  "old-money",
] as const;

export const TASTE_CATEGORY_LABEL: Record<(typeof TASTE_CATEGORY_VALUES)[number], string> = {
  formal: "Formal",
  traditional: "Traditional",
  streetwear: "Streetwear",
  casual: "Casual",
  minimal: "Minimal",
  y2k: "Y2K",
  "old-money": "Old Money",
};

const NAME_MIN = 2;
const NAME_MAX = 150;

export const productFormSchema = z.object({
  name: z.string().trim().min(NAME_MIN, "Enter a product name").max(NAME_MAX),
  price: z.number().int().min(1, "Enter a price"),
  type: z.enum(PRODUCT_TYPE_VALUES),
  category: z.enum(TASTE_CATEGORY_VALUES),
  imageUrl: z.union([z.url("Enter a valid URL"), z.literal("")]).optional(),
  lowStock: z.boolean().optional(),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;
