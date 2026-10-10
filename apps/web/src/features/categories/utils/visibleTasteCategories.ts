import { LANDING_TASTE_CATEGORY_COUNT } from "@outfiqe/utils";

import type { PublicCategory } from "../api/categorySchemas";

export const visibleTasteCategories = (
  allCategories: PublicCategory[],
  storedSlugs: string[] | null,
): PublicCategory[] => {
  if (!storedSlugs) return allCategories.slice(0, LANDING_TASTE_CATEGORY_COUNT);

  const bySlug = new Map(allCategories.map((category) => [category.slug, category]));
  const picked = storedSlugs
    .map((slug) => bySlug.get(slug))
    .filter((category): category is PublicCategory => category !== undefined);

  return picked.length > 0 ? picked : allCategories.slice(0, LANDING_TASTE_CATEGORY_COUNT);
};
