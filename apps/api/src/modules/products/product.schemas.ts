import {
  FIT_HEIGHT_CM_MAX,
  FIT_HEIGHT_CM_MIN,
  FIT_WEIGHT_KG_MAX,
  FIT_WEIGHT_KG_MIN,
  isFitRangeOrdered,
  PRODUCT_SORT,
  PRODUCT_SORT_VALUES,
} from "@outfiqe/utils";
import { z } from "zod";

import { SEARCH_QUERY_MAX_LENGTH } from "#constants/search.constants.js";
import { DiscountType, ProductStatus, ThriftCondition } from "#generated/prisma/enums.js";
import { MAX_BRAND_DISCOUNT_BASIS_POINTS } from "#modules/discounts/discount.constants.js";

const NAME_MIN = 2;
const NAME_MAX = 150;
const TYPE_SLUG_MAX = 40;
const PRICE_MIN = 1;
const PRICE_MAX = 10_000_000;
const FILTER_PRICE_MIN = 0;
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;
const MAX_IMAGES = 6;
const STOCK_MIN = 0;
const STOCK_MAX = 100_000;
const DISCOUNT_PERCENT_BASIS_POINTS_MIN = 1;
const THRIFT_CONDITION_NOTES_MIN = 3;
const THRIFT_CONDITION_NOTES_MAX = 500;

export const productTypeSlugSchema = z.string().trim().min(1).max(TYPE_SLUG_MAX);
export const categorySlugFieldSchema = z.string().trim().min(1).max(60);
export const productStatusSchema = z.enum(ProductStatus);

const MAX_SIZE_CHART_ENTRIES = 50;

const heightCmSchema = z.number().int().min(FIT_HEIGHT_CM_MIN).max(FIT_HEIGHT_CM_MAX);
const weightKgSchema = z.number().int().min(FIT_WEIGHT_KG_MIN).max(FIT_WEIGHT_KG_MAX);

export const fitRangeSchema = z
  .object({
    minHeightCm: heightCmSchema,
    maxHeightCm: heightCmSchema,
    minWeightKg: weightKgSchema,
    maxWeightKg: weightKgSchema,
  })
  .refine(isFitRangeOrdered, { message: "Each range's minimum can't be above its maximum." });

const stockSchema = z.number().int().min(STOCK_MIN).max(STOCK_MAX);

export const productSizeInputSchema = z.object({
  sizeOptionId: z.uuid(),
  stock: stockSchema,
});

export const standardSizeInputSchema = z.object({
  standardLabelId: z.uuid(),
  stock: stockSchema,
  fitRange: fitRangeSchema.nullable().default(null),
});

const AT_LEAST_ONE_SIZE_MESSAGE = "Add at least one size";

const productSizesSchema = z.union([
  z.array(standardSizeInputSchema).min(1, AT_LEAST_ONE_SIZE_MESSAGE),
  z.array(productSizeInputSchema).min(1, AT_LEAST_ONE_SIZE_MESSAGE),
]);

const hasUniqueValues = (values: string[]): boolean => new Set(values).size === values.length;

const IMAGE_ASSET_IDS_MISMATCH_MESSAGE =
  "imageAssetIds must line up one-to-one with imageUrls when both are provided.";

const imageAssetIdsMatchImageUrls = (data: {
  imageUrls?: string[];
  imageAssetIds?: (string | null)[];
}): boolean =>
  data.imageAssetIds === undefined || data.imageAssetIds.length === (data.imageUrls?.length ?? 0);

const productFieldsSchema = z.object({
  name: z.string().min(NAME_MIN).max(NAME_MAX),
  price: z.number().int().min(PRICE_MIN).max(PRICE_MAX),
  type: productTypeSlugSchema,
  categories: z.array(categorySlugFieldSchema).min(1),
  imageUrls: z.array(z.url()).max(MAX_IMAGES).optional(),
  imageAssetIds: z.array(z.uuid().nullable()).max(MAX_IMAGES).optional(),
  lowStock: z.boolean().optional(),
  sizes: productSizesSchema,
  sizeStandardId: z.uuid().optional(),
  isStretchable: z.boolean().nullable().optional(),
  isThrift: z.boolean().optional(),
  thriftConditionRating: z.enum(ThriftCondition).optional(),
  thriftConditionNotes: z
    .string()
    .trim()
    .min(THRIFT_CONDITION_NOTES_MIN)
    .max(THRIFT_CONDITION_NOTES_MAX)
    .optional(),
});

const SIZE_STANDARD_MISMATCH_MESSAGE =
  "Sizes picked from a size standard need its sizeStandardId, and only those sizes can have one.";

const sizeStandardMatchesSizes = (data: {
  sizes?: (ProductSizeInput | StandardSizeInput)[];
  sizeStandardId?: string;
}): boolean => {
  if (!data.sizes) return true;
  const isFromStandard = data.sizes.every((size) => "standardLabelId" in size);
  return isFromStandard === (data.sizeStandardId !== undefined);
};

const standardLabelIdsAreUnique = (data: {
  sizes?: (ProductSizeInput | StandardSizeInput)[];
}): boolean =>
  hasUniqueValues(
    (data.sizes ?? []).flatMap((size) => ("standardLabelId" in size ? [size.standardLabelId] : [])),
  );

const DUPLICATE_SIZES_MESSAGE = "Each size can only be picked once.";

const THRIFT_CONDITION_REQUIRED_MESSAGE =
  "A thrift listing needs a condition rating and a short condition note.";

const thriftConditionFieldsPresentWhenThrift = (data: {
  isThrift?: boolean;
  thriftConditionRating?: ThriftCondition;
  thriftConditionNotes?: string;
}): boolean =>
  !data.isThrift ||
  (data.thriftConditionRating !== undefined && data.thriftConditionNotes !== undefined);

export const createProductSchema = productFieldsSchema
  .refine(sizeStandardMatchesSizes, { message: SIZE_STANDARD_MISMATCH_MESSAGE, path: ["sizes"] })
  .refine(standardLabelIdsAreUnique, { message: DUPLICATE_SIZES_MESSAGE, path: ["sizes"] })
  .refine(imageAssetIdsMatchImageUrls, {
    message: IMAGE_ASSET_IDS_MISMATCH_MESSAGE,
    path: ["imageAssetIds"],
  })
  .refine(thriftConditionFieldsPresentWhenThrift, {
    message: THRIFT_CONDITION_REQUIRED_MESSAGE,
    path: ["thriftConditionRating"],
  });

export const updateProductSchema = productFieldsSchema
  .partial()
  .refine(sizeStandardMatchesSizes, { message: SIZE_STANDARD_MISMATCH_MESSAGE, path: ["sizes"] })
  .refine(standardLabelIdsAreUnique, { message: DUPLICATE_SIZES_MESSAGE, path: ["sizes"] })
  .refine(imageAssetIdsMatchImageUrls, {
    message: IMAGE_ASSET_IDS_MISMATCH_MESSAGE,
    path: ["imageAssetIds"],
  })
  .refine(thriftConditionFieldsPresentWhenThrift, {
    message: THRIFT_CONDITION_REQUIRED_MESSAGE,
    path: ["thriftConditionRating"],
  });

export const productIdParamSchema = z.object({ id: z.uuid() });

export const adjustStockSchema = z.object({
  adjustments: z
    .array(
      z.object({
        sizeId: z.uuid(),
        delta: z
          .number()
          .int()
          .refine((value) => value !== 0, "Adjustment can't be zero"),
      }),
    )
    .min(1)
    .refine(
      (adjustments) =>
        new Set(adjustments.map((adjustment) => adjustment.sizeId)).size === adjustments.length,
      "Each size can only be adjusted once per request.",
    ),
});

export const updateSizeChartSchema = z.object({
  isStretchable: z.boolean().nullable(),
  sizes: z
    .array(z.object({ sizeId: z.uuid(), fitRange: fitRangeSchema.nullable() }))
    .min(1)
    .max(MAX_SIZE_CHART_ENTRIES)
    .refine((sizeChartEntries) => hasUniqueValues(sizeChartEntries.map(({ sizeId }) => sizeId)), {
      message: DUPLICATE_SIZES_MESSAGE,
    }),
});

export type ProductSizeInput = z.infer<typeof productSizeInputSchema>;
export type StandardSizeInput = z.infer<typeof standardSizeInputSchema>;
export type UpdateSizeChartBody = z.infer<typeof updateSizeChartSchema>;
export type AdjustStockBody = z.infer<typeof adjustStockSchema>;

const discountAmountFieldsMatchType = (data: {
  discountType: DiscountType;
  percentBasisPoints?: number;
  fixedAmount?: number;
}): boolean =>
  data.discountType === DiscountType.PERCENT
    ? data.percentBasisPoints !== undefined && data.fixedAmount === undefined
    : data.fixedAmount !== undefined && data.percentBasisPoints === undefined;

const DISCOUNT_AMOUNT_FIELD_MISMATCH_MESSAGE =
  "Provide percentBasisPoints for a PERCENT discount or fixedAmount for a FIXED discount, not both.";

export const setProductDiscountSchema = z
  .object({
    discountType: z.enum(DiscountType),
    percentBasisPoints: z
      .number()
      .int()
      .min(DISCOUNT_PERCENT_BASIS_POINTS_MIN)
      .max(MAX_BRAND_DISCOUNT_BASIS_POINTS)
      .optional(),
    fixedAmount: z.number().int().min(PRICE_MIN).max(PRICE_MAX).optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().nullable().optional(),
  })
  .refine(discountAmountFieldsMatchType, { message: DISCOUNT_AMOUNT_FIELD_MISMATCH_MESSAGE })
  .refine((data) => !data.endsAt || data.endsAt > data.startsAt, {
    message: "endsAt must be after startsAt.",
    path: ["endsAt"],
  });

export const updateProductDiscountSchema = z
  .object({
    discountType: z.enum(DiscountType).optional(),
    percentBasisPoints: z
      .number()
      .int()
      .min(DISCOUNT_PERCENT_BASIS_POINTS_MIN)
      .max(MAX_BRAND_DISCOUNT_BASIS_POINTS)
      .optional(),
    fixedAmount: z.number().int().min(PRICE_MIN).max(PRICE_MAX).optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().nullable().optional(),
  })
  .refine((data) => !(data.percentBasisPoints !== undefined && data.fixedAmount !== undefined), {
    message: "Provide either percentBasisPoints or fixedAmount, not both.",
  });

const booleanFilterSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

export const listReviewProductsQuerySchema = z.object({
  status: productStatusSchema.optional(),
  isThrift: booleanFilterSchema,
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const autocompleteQuerySchema = z.object({
  q: z.string().trim().min(1).max(SEARCH_QUERY_MAX_LENGTH),
});

export const listPublicProductsQuerySchema = z.object({
  category: categorySlugFieldSchema.optional(),
  type: productTypeSlugSchema.optional(),
  q: z.string().trim().min(1).max(SEARCH_QUERY_MAX_LENGTH).optional(),
  sort: z.enum(PRODUCT_SORT_VALUES).default(PRODUCT_SORT.NEWEST),
  minPrice: z.coerce.number().int().min(FILTER_PRICE_MIN).max(PRICE_MAX).optional(),
  maxPrice: z.coerce.number().int().min(FILTER_PRICE_MIN).max(PRICE_MAX).optional(),
  inStock: booleanFilterSchema,
  thrift: booleanFilterSchema,
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const listBrandProductsQuerySchema = z.object({
  type: productTypeSlugSchema.optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const listMineProductsQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
export type ProductIdParam = z.infer<typeof productIdParamSchema>;
export type ListReviewProductsQuery = z.infer<typeof listReviewProductsQuerySchema>;
export type AutocompleteQuery = z.infer<typeof autocompleteQuerySchema>;
export type ListPublicProductsQuery = z.infer<typeof listPublicProductsQuerySchema>;
export type ListBrandProductsQuery = z.infer<typeof listBrandProductsQuerySchema>;
export type ListMineProductsQuery = z.infer<typeof listMineProductsQuerySchema>;
export type SetProductDiscountBody = z.infer<typeof setProductDiscountSchema>;
export type UpdateProductDiscountBody = z.infer<typeof updateProductDiscountSchema>;
