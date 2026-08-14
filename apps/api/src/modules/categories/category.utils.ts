import type { CategoryWithProductCount, PublicCategory } from "./category.types.js";

export const toPublicCategory = (category: CategoryWithProductCount): PublicCategory => ({
  id: category.id,
  slug: category.slug,
  name: category.name,
  imageUrl: category.imageUrl,
  productCount: category.productCount,
});
