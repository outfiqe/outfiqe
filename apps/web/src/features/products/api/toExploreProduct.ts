import type { ExploreProduct } from "@/features/landing/components/ProductCard";
import type { PublicProduct } from "./productSchemas";

export const toExploreProduct = (product: PublicProduct): ExploreProduct => ({
  id: product.id,
  brand: product.brand,
  name: product.name,
  price: product.price,
  wornByCount: 0,
  categorySlug: product.categorySlug,
  type: product.type,
  lowStock: product.lowStock,
  isNew: product.isNew,
  image: product.imageUrl ?? undefined,
});
