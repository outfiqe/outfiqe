import { PRODUCT_SORT, PRODUCT_SORT_VALUES } from "@outfiqe/utils";
import { z } from "zod";

import { SEARCH_QUERY_MAX_LENGTH } from "#constants/search.constants.js";
import { DiscountType, ProductStatus } from "#generated/prisma/enums.js";
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

export const productTypeSlugSchema = z.string().trim().min(1).max(TYPE_SLUG_MAX);
export const categorySlugFieldSchema = z.string().trim().min(1).max(60);
export const productStatusSchema = z.enum(ProductStatus);

export const productSizeInputSchema = z.object({
  sizeOptionId: z.uuid(),
  stock: z.number().int().min(STOCK_MIN).max(STOCK_MAX),
});

export const createProductSchema = z.object({
  name: z.string().min(NAME_MIN).max(NAME_MAX),
  price: z.number().int().min(PRICE_MIN).max(PRICE_MAX),
  type: productTypeSlugSchema,
  categories: z.array(categorySlugFieldSchema).min(1),
  imageUrls: z.array(z.url()).max(MAX_IMAGES).optional(),
  lowStock: z.boolean().optional(),
  sizes: z.array(productSizeInputSchema).min(1, "Add at least one size"),
});

export const updateProductSchema = createProductSchema.partial();

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
    .min(1),
});

export type ProductSizeInput = z.infer<typeof productSizeInputSchema>;
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

export const listReviewProductsQuerySchema = z.object({
  status: productStatusSchema.optional(),
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
  inStock: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
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
