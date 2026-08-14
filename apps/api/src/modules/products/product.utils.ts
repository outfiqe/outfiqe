import { NEW_ARRIVAL_WINDOW_MS, PRODUCT_TYPE_TO_SLUG } from "./product.constants.js";
import type { ProductBrandSummary, ProductWithBrand, PublicProduct } from "./product.types.js";

export const isNew = (createdAt: Date): boolean =>
  Date.now() - createdAt.getTime() <= NEW_ARRIVAL_WINDOW_MS;

export const humanizeSlug = (slug: string): string =>
  slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const toPublicProduct = (product: ProductWithBrand): PublicProduct => ({
  id: product.id,
  brand: product.brand.name,
  name: product.name,
  price: product.price,
  type: PRODUCT_TYPE_TO_SLUG[product.type],
  categorySlugs: product.categories.map((category) => category.slug),
  imageUrl: product.imageUrl,
  lowStock: product.lowStock,
  isNew: isNew(product.createdAt),
});

export const toBrandSummary = ({
  categories,
  brand: _brand,
  type,
  ...rest
}: ProductWithBrand): ProductBrandSummary => ({
  ...rest,
  type: PRODUCT_TYPE_TO_SLUG[type],
  categories: categories.map((category) => category.name),
});
