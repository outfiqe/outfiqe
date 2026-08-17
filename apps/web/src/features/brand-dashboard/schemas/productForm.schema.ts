import type { ProductTypeSlug } from "@outfiqe/utils";
import { PRODUCT_TYPE_SLUGS } from "@outfiqe/utils";
import { z } from "zod";

const NAME_MIN = 2;
const NAME_MAX = 150;
export const MAX_IMAGES = 6;
const STOCK_MIN = 0;

export const productSizeFormSchema = z.object({
  sizeOptionId: z.string(),
  stock: z.number().int().min(STOCK_MIN, "Stock can't be negative"),
});

export const productFormSchema = z.object({
  name: z.string().trim().min(NAME_MIN, "Enter a product name").max(NAME_MAX),
  price: z.number().int().min(1, "Enter a price"),
  type: z.enum(PRODUCT_TYPE_SLUGS),
  categories: z.array(z.string()).min(1, "Select at least one category"),
  imageUrls: z.array(z.url()).max(MAX_IMAGES).optional(),
  lowStock: z.boolean().optional(),
  sizes: z.array(productSizeFormSchema).min(1, "Add at least one size"),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;

export const buildEditProductFormSchema = (originalType: ProductTypeSlug) =>
  z
    .object({
      name: z.string().trim().min(NAME_MIN, "Enter a product name").max(NAME_MAX),
      price: z.number().int().min(1, "Enter a price"),
      type: z.enum(PRODUCT_TYPE_SLUGS),
      categories: z.array(z.string()).min(1, "Select at least one category"),
      imageUrls: z.array(z.url()).max(MAX_IMAGES).optional(),
      lowStock: z.boolean().optional(),
      sizes: z.array(productSizeFormSchema).optional(),
    })
    .refine((data) => data.type === originalType || (data.sizes && data.sizes.length > 0), {
      message: "Add at least one size for the new type",
      path: ["sizes"],
    });

export type EditProductFormInput = z.infer<ReturnType<typeof buildEditProductFormSchema>>;
