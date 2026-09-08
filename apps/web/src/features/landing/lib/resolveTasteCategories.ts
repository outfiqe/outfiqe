import type { PublicCategory } from "@/features/categories";
import { visibleTasteCategories } from "@/features/categories/lib/visibleTasteCategories";

export const resolveDisplayCategories = (
  allCategories: PublicCategory[],
  storedSlugs: string[] | null,
  deepLinkedSlug: string | null,
): PublicCategory[] => {
  const visibleCategories = visibleTasteCategories(allCategories, storedSlugs);
  if (!deepLinkedSlug || visibleCategories.some((category) => category.slug === deepLinkedSlug)) {
    return visibleCategories;
  }
  const deepLinkedCategory = allCategories.find((category) => category.slug === deepLinkedSlug);
  return deepLinkedCategory ? [deepLinkedCategory, ...visibleCategories] : visibleCategories;
};

export const resolveActiveCategorySlug = (
  displayCategories: PublicCategory[],
  deepLinkedSlug: string | null,
): string | undefined => deepLinkedSlug ?? displayCategories[0]?.slug;
