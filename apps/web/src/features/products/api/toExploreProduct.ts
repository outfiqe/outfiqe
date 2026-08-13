import type { ExploreProduct } from "@/features/landing/components/ProductCard";
import type { PublicProduct } from "./productSchemas";

const getMockWornByCount = (productId: string): number => {
  const weightedSum = [...productId].reduce(
    (sum, char, index) => sum + char.charCodeAt(0) * (index + 2),
    0,
  );
  return (weightedSum % 6) + 1;
};

export const toExploreProduct = (product: PublicProduct): ExploreProduct => ({
  id: product.id,
  brand: product.brand,
  name: product.name,
  price: product.price,
  wornByCount: getMockWornByCount(product.id),
  categorySlugs: product.categorySlugs,
  type: product.type,
  lowStock: product.lowStock,
  isNew: product.isNew,
  image: product.imageUrl ?? undefined,
});
