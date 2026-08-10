import type { ExploreProduct } from "@/features/landing/components/ProductCard";
import type { PublicProduct } from "./productSchemas";

// Mock "worn by" count — no product listing endpoint returns the real tagged-creator count yet
// (only the single-product detail endpoint does). Deterministic from the product id so it's
// stable across renders instead of flashing a different number on every refetch.
const getMockWornByCount = (productId: string): number => {
  // Position-weighted (not a flat sum) so it doesn't move in lockstep with the other id-derived
  // mock values on the card, and so a constant multiplier can't collapse onto one bucket when it
  // shares a factor with the modulus below.
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
  categorySlug: product.categorySlug,
  type: product.type,
  lowStock: product.lowStock,
  isNew: product.isNew,
  image: product.imageUrl ?? undefined,
});
