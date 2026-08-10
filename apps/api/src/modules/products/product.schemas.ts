import { z } from "zod";

import { ProductStatus } from "../../generated/prisma/enums.js";
import { PRODUCT_TYPE_SLUGS, TASTE_CATEGORY_SLUGS } from "./product.constants.js";

const NAME_MIN = 2;
const NAME_MAX = 150;
const PRICE_MIN = 1;
const PRICE_MAX = 10_000_000;
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

export const productTypeSlugSchema = z.enum(PRODUCT_TYPE_SLUGS);
export const tasteCategorySlugSchema = z.enum(TASTE_CATEGORY_SLUGS);
export const productStatusSchema = z.enum(ProductStatus);

export const createProductSchema = z.object({
  name: z.string().min(NAME_MIN).max(NAME_MAX),
  price: z.number().int().min(PRICE_MIN).max(PRICE_MAX),
  type: productTypeSlugSchema,
  category: tasteCategorySlugSchema,
  imageUrl: z.url().optional(),
  lowStock: z.boolean().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const productIdParamSchema = z.object({ id: z.uuid() });

export const listReviewProductsQuerySchema = z.object({
  status: productStatusSchema.optional(),
});

export const listPublicProductsQuerySchema = z.object({
  category: tasteCategorySlugSchema.optional(),
  type: productTypeSlugSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const listBrandProductsQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
export type ProductIdParam = z.infer<typeof productIdParamSchema>;
export type ListReviewProductsQuery = z.infer<typeof listReviewProductsQuerySchema>;
export type ListPublicProductsQuery = z.infer<typeof listPublicProductsQuerySchema>;
export type ListBrandProductsQuery = z.infer<typeof listBrandProductsQuerySchema>;
