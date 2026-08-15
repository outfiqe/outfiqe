import {
  LOW_STOCK_THRESHOLD,
  NEW_ARRIVAL_WINDOW_MS,
  PRODUCT_TYPE_TO_SLUG,
} from "./product.constants.js";
import type {
  ProductBrandSummary,
  ProductWithOptionalStock,
  ProductWithStock,
  PublicProduct,
} from "./product.types.js";

export const isNew = (createdAt: Date): boolean =>
  Date.now() - createdAt.getTime() <= NEW_ARRIVAL_WINDOW_MS;

export const humanizeSlug = (slug: string): string =>
  slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const sumStock = (sizes: { stock: number }[]): number =>
  sizes.reduce((total, size) => total + size.stock, 0);

export const isLowStock = (totalStock: number): boolean =>
  totalStock > 0 && totalStock <= LOW_STOCK_THRESHOLD;

export const toPublicProduct = (product: ProductWithOptionalStock): PublicProduct => ({
  id: product.id,
  brand: product.brand.name,
  name: product.name,
  price: product.price,
  type: PRODUCT_TYPE_TO_SLUG[product.type],
  categorySlugs: product.categories.map((category) => category.slug),
  imageUrl: product.imageUrl,
  lowStock: product.totalStock === undefined ? product.lowStock : isLowStock(product.totalStock),
  isNew: isNew(product.createdAt),
});

export const toBrandSummary = ({
  categories,
  brand: _brand,
  type,
  totalStock,
  lowStock: _lowStock,
  ...rest
}: ProductWithStock): ProductBrandSummary => ({
  ...rest,
  type: PRODUCT_TYPE_TO_SLUG[type],
  categories: categories.map((category) => category.name),
  lowStock: isLowStock(totalStock),
});
