import {
  LOW_STOCK_THRESHOLD,
  NEW_ARRIVAL_WINDOW_MS,
  PRODUCT_TYPE_TO_SLUG,
} from "./product.constants.js";
import type {
  ProductBrandSummary,
  ProductWithOptionalStock,
  ProductWithStockSizesAndImages,
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

export const toPublicProduct = (product: ProductWithOptionalStock): PublicProduct => {
  const { id, brand, name, price, type, categories, imageUrl, totalStock, lowStock, createdAt } =
    product;
  return {
    id,
    brand: brand.name,
    name,
    price,
    type: PRODUCT_TYPE_TO_SLUG[type],
    categorySlugs: categories.map((category) => category.slug),
    imageUrl,
    lowStock: totalStock === undefined ? lowStock : isLowStock(totalStock),
    isNew: isNew(createdAt),
  };
};

export const toBrandSummary = ({
  categories,
  images,
  brand: _brand,
  type,
  totalStock,
  lowStock: _lowStock,
  ...rest
}: ProductWithStockSizesAndImages): ProductBrandSummary => ({
  ...rest,
  type: PRODUCT_TYPE_TO_SLUG[type],
  categories: categories.map((category) => category.name),
  categorySlugs: categories.map((category) => category.slug),
  imageUrls: images.map((image) => image.url),
  lowStock: isLowStock(totalStock),
});
