import type { FitRange } from "@outfiqe/utils";
import { z } from "zod";

import { thriftConditionSchema } from "@/features/products/api/productSchemas";

import { fitRangeDraftSchema, toFitRange } from "./sizeChart.schema";

const NAME_MIN = 2;
const NAME_MAX = 150;
export const MAX_IMAGES = 6;
const STOCK_MIN = 0;
const THRIFT_CONDITION_NOTES_MIN = 3;
const THRIFT_CONDITION_NOTES_MAX = 500;

export const productSizeFormSchema = z.object({
  standardLabelId: z.string(),
  label: z.string(),
  stock: z.number().int().min(STOCK_MIN, "Stock can't be negative"),
  fitRange: fitRangeDraftSchema,
});
export type ProductSizeFormRow = z.infer<typeof productSizeFormSchema>;

const PICK_SIZE_STANDARD_MESSAGE = "Pick a size standard";

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
    sizeStandardId: z.string().min(1, PICK_SIZE_STANDARD_MESSAGE),
    sizes: z.array(productSizeFormSchema).min(1, "Add at least one size"),
    isStretchable: z.boolean().nullable(),
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
      sizeStandardId: z.string(),
      sizes: z.array(productSizeFormSchema).optional(),
      isStretchable: z.boolean().nullable(),
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
    .refine((data) => data.type === originalType || data.sizeStandardId.length > 0, {
      message: PICK_SIZE_STANDARD_MESSAGE,
      path: ["sizeStandardId"],
    })
    .refine(thriftConditionFieldsPresentWhenThrift, {
      message: THRIFT_CONDITION_REQUIRED_MESSAGE,
      path: ["thriftConditionRating"],
    });

export type EditProductFormInput = z.infer<ReturnType<typeof buildEditProductFormSchema>>;

export type ProductSizePayload = {
  standardLabelId: string;
  stock: number;
  fitRange: FitRange | null;
};

export type CreateProductPayload = Omit<ProductFormInput, "sizes" | "isStretchable"> & {
  sizes: ProductSizePayload[];
  isStretchable?: boolean | null;
};

export type UpdateProductPayload = Omit<
  EditProductFormInput,
  "sizes" | "sizeStandardId" | "isStretchable"
> & {
  sizes?: ProductSizePayload[];
  sizeStandardId?: string;
  isStretchable?: boolean | null;
};

const toSizePayloads = (
  sizes: ProductSizeFormRow[],
  supportsFitRanges: boolean,
): ProductSizePayload[] =>
  sizes.map(({ standardLabelId, stock, fitRange }) => ({
    standardLabelId,
    stock,
    fitRange: supportsFitRanges ? toFitRange(fitRange) : null,
  }));

export const toCreateProductPayload = (
  { sizes, isStretchable, ...productFields }: ProductFormInput,
  supportsFitRanges: boolean,
): CreateProductPayload => ({
  ...productFields,
  sizes: toSizePayloads(sizes, supportsFitRanges),
  isStretchable: supportsFitRanges ? isStretchable : null,
});

export const toUpdateProductPayload = (
  { sizes, sizeStandardId, isStretchable, ...productFields }: EditProductFormInput,
  { hasTypeChanged, supportsFitRanges }: { hasTypeChanged: boolean; supportsFitRanges: boolean },
): UpdateProductPayload => ({
  ...productFields,
  ...(hasTypeChanged && sizes
    ? { sizes: toSizePayloads(sizes, supportsFitRanges), sizeStandardId }
    : {}),
  isStretchable: supportsFitRanges ? isStretchable : null,
});
