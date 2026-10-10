import { z } from "zod";

import { thriftConditionSchema } from "@/features/products/api/productSchemas";

const NAME_MIN = 2;
const NAME_MAX = 150;
export const MAX_IMAGES = 6;
const STOCK_MIN = 0;
const THRIFT_CONDITION_NOTES_MIN = 3;
const THRIFT_CONDITION_NOTES_MAX = 500;

export const productSizeFormSchema = z.object({
  sizeOptionId: z.string(),
  stock: z.number().int().min(STOCK_MIN, "Stock can't be negative"),
});

const THRIFT_CONDITION_REQUIRED_MESSAGE =
  "Add a condition rating and a short condition note for a thrift listing.";

const thriftConditionFieldsPresentWhenThrift = (data: {
  isThrift?: boolean;
  thriftConditionRating?: string;
  thriftConditionNotes?: string;
}): boolean =>
  !data.isThrift ||
  (data.thriftConditionRating !== undefined &&
    data.thriftConditionRating !== "" &&
    Boolean(data.thriftConditionNotes));

export const productFormSchema = z
  .object({
    name: z.string().trim().min(NAME_MIN, "Enter a product name").max(NAME_MAX),
    price: z.number().int().min(1, "Enter a price"),
    type: z.string().min(1, "Select a type"),
    categories: z.array(z.string()).min(1, "Select at least one category"),
    imageUrls: z.array(z.url()).max(MAX_IMAGES).optional(),
    imageAssetIds: z.array(z.uuid().nullable()).max(MAX_IMAGES).optional(),
    lowStock: z.boolean().optional(),
    sizes: z.array(productSizeFormSchema).min(1, "Add at least one size"),
    isThrift: z.boolean().optional(),
    thriftConditionRating: thriftConditionSchema.optional(),
    thriftConditionNotes: z
      .string()
      .trim()
      .min(THRIFT_CONDITION_NOTES_MIN)
      .max(THRIFT_CONDITION_NOTES_MAX)
      .optional(),
  })
  .refine(thriftConditionFieldsPresentWhenThrift, {
    message: THRIFT_CONDITION_REQUIRED_MESSAGE,
    path: ["thriftConditionRating"],
  });

export type ProductFormInput = z.infer<typeof productFormSchema>;

export const buildEditProductFormSchema = (originalType: string) =>
  z
    .object({
      name: z.string().trim().min(NAME_MIN, "Enter a product name").max(NAME_MAX),
      price: z.number().int().min(1, "Enter a price"),
      type: z.string().min(1, "Select a type"),
      categories: z.array(z.string()).min(1, "Select at least one category"),
      imageUrls: z.array(z.url()).max(MAX_IMAGES).optional(),
      imageAssetIds: z.array(z.uuid().nullable()).max(MAX_IMAGES).optional(),
      lowStock: z.boolean().optional(),
      sizes: z.array(productSizeFormSchema).optional(),
      isThrift: z.boolean().optional(),
      thriftConditionRating: thriftConditionSchema.optional(),
      thriftConditionNotes: z
        .string()
        .trim()
        .min(THRIFT_CONDITION_NOTES_MIN)
        .max(THRIFT_CONDITION_NOTES_MAX)
        .optional(),
    })
    .refine((data) => data.type === originalType || (data.sizes && data.sizes.length > 0), {
      message: "Add at least one size for the new type",
      path: ["sizes"],
    })
    .refine(thriftConditionFieldsPresentWhenThrift, {
      message: THRIFT_CONDITION_REQUIRED_MESSAGE,
      path: ["thriftConditionRating"],
    });

export type EditProductFormInput = z.infer<ReturnType<typeof buildEditProductFormSchema>>;
