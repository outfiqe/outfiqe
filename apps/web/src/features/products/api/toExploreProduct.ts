import type { ExploreProduct } from "@/features/landing/components/ProductCard";

import type { PublicProduct } from "./productSchemas";

export const toExploreProduct = (product: PublicProduct): ExploreProduct => ({
  id: product.id,
  brand: product.brand,
  name: product.name,
  price: product.price,
  effectivePrice: product.effectivePrice,
  discountPercent: product.discountPercent,
  creatorBuyerCount: product.creatorBuyerCount,
  unitsSold: product.unitsSold,
  categorySlugs: product.categorySlugs,
  type: product.type,
  lowStock: product.lowStock,
  isNew: product.isNew,
  image: product.imageUrl ?? undefined,
  avgRating: product.avgRating,
  reviewCount: product.reviewCount,
});
